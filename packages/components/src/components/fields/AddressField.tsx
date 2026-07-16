import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FieldValues, useController, useFormState, useWatch } from 'react-hook-form';

import type { AddressingCapability, AddressSuggestion } from '@openzeppelin/ui-types';
import {
  classifyAddressInput,
  crossNetworkFallbackMessageNames,
  getFallbackNetworks,
  isChainScopeMismatch,
  isCrossNetworkFallback,
  nameResolutionChainScopeMismatchMessage,
  nameResolutionCrossNetworkFallbackMessage,
  nameResolutionMessageForCode,
  type AddressInputClassification,
  type NameResolutionErrorCode,
} from '@openzeppelin/ui-utils';

import { AddressSuggestionList } from './address-suggestion/AddressSuggestionList';
import { useAddressSuggestionField } from './address-suggestion/useAddressSuggestionField';
import {
  useInjectedNameResolution,
  type InjectedNameResolutionResult,
} from './name-resolution/useInjectedNameResolution';
import { useNameResolver } from './name-resolution/useNameResolver';
import { useResolvingAnnouncerCopy } from './name-resolution/useResolvingAnnouncerCopy';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BaseFieldProps } from './BaseField';
import {
  ErrorMessage,
  getAccessibilityProps,
  getValidationStateClasses,
  handleEscapeKey,
  validateField,
} from './utils';

export interface AddressFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  addressing?: AddressingCapability;

  /**
   * Explicit suggestion list. When provided, overrides context-based resolution.
   * Pass `false` to disable suggestions entirely (even when a context provider is mounted).
   *
   * Note: context-resolved suggestions are automatically capped at
   * `MAX_SUGGESTIONS` (5) entries, while explicitly passed arrays are
   * rendered as-is — callers should pre-slice if needed.
   */
  suggestions?: AddressSuggestion[] | false;

  /**
   * Called when the user selects a suggestion. Receives the selected suggestion
   * so callers can perform additional side-effects beyond filling the field value.
   */
  onSuggestionSelect?: (suggestion: AddressSuggestion) => void;

  /**
   * Fired when the resolved-and-name-matched name changes. Emits the resolved
   * NAME (not the hex) on `resolved` + name-match, and `undefined` in every
   * other state (idle / debouncing / loading / error / hex / cleared).
   *
   * Pure notification for consumers that want the human-readable name (e.g.
   * the address book's alias suggestion, SF-5 INV-109..111). It reads existing
   * resolution state and does NOT participate in the resolved-hex write path
   * (INV-75/79/80/81/85 unaffected). With no injected resolver it only ever
   * emits `undefined`, so the field stays behavior-identical (INV-82).
   */
  onResolvedNameChange?: (name: string | undefined) => void;

  /**
   * When `false`, suppresses the forward cross-network fallback disclaimer under
   * the frozen "Resolved to …" template. Default `true`. Use when a sibling
   * `AddressDisplay` already surfaces the same message (e.g. demo resolved card).
   */
  showCrossNetworkFallbackDisclaimer?: boolean;
}

/**
 * Non-user-facing gate string returned by the sync validator while a typed name
 * is resolving, so `formState.isValid` is `false` even for an optional field
 * (INV-84). The visible message comes from the aria-live region, never this string.
 */
const NAME_RESOLUTION_PENDING_GATE = '__ens_name_resolution_pending__';

/** Codes for which a `retry()` affordance is offered — transient only (INV-90). */
const TRANSIENT_ERROR_CODES: ReadonlySet<NameResolutionErrorCode> = new Set([
  'RESOLUTION_TIMEOUT',
  'EXTERNAL_GATEWAY_ERROR',
  'ADAPTER_ERROR',
]);

/**
 * Normalize a typed name for the resolved-write match guard: trim then lowercase,
 * mirroring the SF-2 engine (whose echoed `result.name` is already normalized).
 * Comparing the raw typed value would spuriously fail on case/whitespace (INV-79).
 */
function normalizeResolvedName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Address input field component specifically designed for blockchain addresses via React Hook Form integration.
 *
 * Architecture flow:
 * 1. Form schemas are generated from contract functions using adapters
 * 2. TransactionForm renders the overall form structure with React Hook Form
 * 3. DynamicFormField selects the appropriate field component (like AddressField) based on field type
 * 4. BaseField provides consistent layout and hook form integration
 * 5. This component handles blockchain address-specific rendering and validation using the passed addressing capability
 *
 * The component includes:
 * - Integration with React Hook Form
 * - Blockchain address validation through the provided addressing capability
 * - Automatic error handling and reporting
 * - Chain-agnostic design (validation handled by capabilities)
 * - Full accessibility support with ARIA attributes
 * - Keyboard navigation
 *
 * Autocomplete suggestions can be provided in two ways:
 *
 * 1. **Context-based (zero-config)**: Mount an `AddressSuggestionProvider` in the
 *    component tree. Every `AddressField` below it automatically resolves suggestions.
 *
 * 2. **Prop-based (explicit)**: Pass `suggestions` directly. This overrides context.
 *    Pass `suggestions={false}` to opt out when a provider is mounted.
 *
 * The suggestion dropdown includes built-in debouncing, keyboard navigation (Arrow keys,
 * Enter, Escape), click-outside dismissal, and ARIA listbox semantics — all provided by
 * the shared headless `useAddressSuggestionField` hook + `AddressSuggestionList`.
 *
 * **Inline name resolution (SF-3, opt-in via context).** When a
 * `NameResolverProvider` is mounted, the field also accepts a name (e.g.
 * `alice.eth`): the name is resolved inline through the injected `resolveName`
 * and the RHF form value becomes the resolved hex — never the name, never a
 * silently-coerced value. The correctness spine is a shadow-state model:
 * the `<input>` always shows the typed string (`inputValue`, INV-69); the RHF
 * value is `''` for every unresolved name state so submit stays gated with no
 * async validator (INV-75); the single name→hex write fires only on
 * `resolved` + normalized name-match (INV-79/80). With **no** provider mounted
 * every resolution branch below is dead code and the field is byte-identical
 * to its pre-ENS behavior (INV-82 — the LOCKED backward-compat guarantee).
 * The component stays capability-free: it never reads a runtime or wallet
 * state; everything arrives through the injected context (INV-118).
 */
export function AddressField<TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  placeholder,
  helperText,
  control,
  name,
  width = 'full',
  validation,
  addressing,
  readOnly,
  suggestions: suggestionsProp,
  onSuggestionSelect,
  onResolvedNameChange,
  showCrossNetworkFallbackDisclaimer = true,
}: AddressFieldProps<TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const resolutionRegionId = `${id}-resolution`;

  // Injected forward resolver — `null` with no NameResolverProvider mounted,
  // in which case every resolution branch below is dead code (INV-82).
  const resolver = useNameResolver();
  const resolveName = resolver?.resolveName;
  const isValidName = resolver?.isValidName;
  const activeNetworkId = resolver?.activeNetworkId;
  const activeNetworkName = resolver?.activeNetworkName;
  const resolveNetworkLabel = resolver?.resolveNetworkLabel;

  const lastSetValueRef = useRef<string>('');
  const [inputValue, setInputValue] = useState('');

  const watchedFieldValue = useWatch({ control, name }) as string | undefined;

  useEffect(() => {
    const currentFieldValue = watchedFieldValue ?? '';
    if (currentFieldValue !== lastSetValueRef.current) {
      lastSetValueRef.current = currentFieldValue;
      setInputValue(currentFieldValue);
    }
  }, [watchedFieldValue]);

  // Stable injected predicate for the classifier (chain-neutral; no capability leak).
  const isValidAddress = useMemo(
    () => (addressing ? (v: string): boolean => addressing.isValidAddress(v) : undefined),
    [addressing]
  );

  const classification = useMemo(
    () => classifyAddressInput(inputValue, { isValidAddress, isValidName }),
    [inputValue, isValidAddress, isValidName]
  );

  // Master gate for every resolution branch (INV-82).
  const resolverActive = resolver !== null && classification === 'name-candidate';
  // INV-83: the machine runs only for a name candidate with an injected resolveName.
  const nameEnabled = resolverActive && resolveName != null;
  // Provider mounted but no forward method on this runtime → the name-candidate
  // surfaces UNSUPPORTED_NETWORK with zero calls (SC-006 / INV-87 / INV-119).
  const forwardUnsupported = resolverActive && resolveName == null;

  const resolution = useInjectedNameResolution({
    input: inputValue,
    enabled: nameEnabled,
    resolveName,
  });

  const chainScopeBlocked =
    resolution.status === 'resolved' &&
    isChainScopeMismatch(resolution.data.provenance, activeNetworkId);

  const isResolutionPending =
    !forwardUnsupported && (resolution.status === 'debouncing' || resolution.status === 'loading');
  const resolvingAnnouncerCopy = useResolvingAnnouncerCopy({
    isPending: isResolutionPending,
  });

  // Refs the synchronous `validate` reads. Kept current below (and synchronously in
  // `commitTypedValue`) so the pending guard (INV-84) sees the latest state even
  // when RHF revalidates before the next render commits.
  const resolverPresentRef = useRef(false);
  const classificationRef = useRef<AddressInputClassification>('empty');
  const statusRef = useRef<InjectedNameResolutionResult['status']>('idle');
  const resolvedNameRef = useRef<string | undefined>(undefined);
  const chainScopeBlockedRef = useRef(false);
  const validationRef = useRef(validation);
  const addressingRef = useRef(addressing);
  resolverPresentRef.current = resolver !== null;
  classificationRef.current = classification;
  statusRef.current = resolution.status;
  resolvedNameRef.current = resolution.status === 'resolved' ? resolution.name : undefined;
  chainScopeBlockedRef.current = chainScopeBlocked;
  validationRef.current = validation;
  addressingRef.current = addressing;

  const validate = useCallback((value: unknown): string | boolean => {
    // INV-84: optional-field resolution-pending guard — a pending name gates submit
    // regardless of `required`. Checked BEFORE the legacy empty short-circuit, and
    // gated on resolver presence so the no-resolver validator is byte-identical (INV-82).
    if (
      resolverPresentRef.current &&
      classificationRef.current === 'name-candidate' &&
      (statusRef.current !== 'resolved' || chainScopeBlockedRef.current)
    ) {
      return NAME_RESOLUTION_PENDING_GATE;
    }

    // Check required field explicitly first
    if (value === undefined || value === null || value === '') {
      return validationRef.current?.required ? 'This field is required' : true;
    }

    // Perform standard validations (min, max, pattern, etc.) if they exist
    // Using the existing validateField utility for this part
    const standardValidationResult = validateField(value, validationRef.current);
    if (standardValidationResult !== true) {
      return standardValidationResult;
    }

    // Perform capability-specific address validation if addressing exists
    if (addressingRef.current && typeof value === 'string') {
      if (!addressingRef.current.isValidAddress(value)) {
        return 'Invalid address format for the selected chain';
      }
    }

    // If all checks pass
    return true;
  }, []);

  const { field, fieldState } = useController({
    control,
    name,
    rules: { validate },
    disabled: readOnly,
  });
  const fieldOnChange = field.onChange;

  // INV-84 enforcement at the formState level. RHF (^7.79) includes `isValid`
  // in a state emission only when it differs from its internal snapshot, and
  // the mount-time isValid computation is async — so a name keystroke that
  // does not change the RHF value ('' → '') can have its isValid=false lost to
  // a stale in-flight `{isValid: true}` emission, leaving `formState.isValid`
  // stuck `true` through debouncing/loading/error (nothing later reconciles,
  // because pending-state commits never change the value). Observing isValid
  // and re-asserting the gate error converges regardless of emission order:
  // every stale `true` re-renders this component and re-triggers the effect,
  // and `control.setError` unconditionally emits isValid=false.
  // With no resolver the subscription is disabled and `.isValid` is never read
  // (the proxy read is what opts the form into isValid tracking), so the field
  // adds zero validation traffic and zero re-renders (INV-82).
  const gateFormState = useFormState({ control, disabled: resolver === null });
  const observedIsValid = resolver !== null && gateFormState.isValid;
  const pendingNameGate =
    resolver !== null &&
    classification === 'name-candidate' &&
    (resolution.status !== 'resolved' || chainScopeBlocked);
  useEffect(() => {
    if (pendingNameGate && observedIsValid) {
      control.setError(name, { type: 'validate', message: NAME_RESOLUTION_PENDING_GATE });
    }
  }, [pendingNameGate, observedIsValid, control, name]);

  // INV-79 / INV-80 / INV-85: the single name→hex write site. Reads the CURRENT
  // resolution inline (no cached hex), fires only on `resolved` AND when the typed
  // input still normalizes to the resolved name — so a stale in-flight resolution
  // can never write a hex after the user has typed on. The machine-level
  // out-of-order drop (INV-117) guarantees this effect never even sees a
  // mismatched (resolved, name) pair.
  const resolvedAddress = resolution.status === 'resolved' ? resolution.data.address : undefined;
  const resolvedName = resolution.status === 'resolved' ? resolution.name : undefined;
  const isResolvedNameMatch =
    resolvedName !== undefined && normalizeResolvedName(inputValue) === resolvedName;
  useEffect(() => {
    // INV-79 / INV-80 / INV-85 / INV-134: the single name→hex write site.
    if (isResolvedNameMatch && resolvedAddress !== undefined && !chainScopeBlocked) {
      // Keep the display decoupled: the useWatch sync must not overwrite the
      // typed name with the hex we are about to write (INV-69).
      lastSetValueRef.current = resolvedAddress;
      fieldOnChange(resolvedAddress);
    }
  }, [isResolvedNameMatch, resolvedAddress, chainScopeBlocked, fieldOnChange]);

  // Additive, READ-ONLY name-notification channel (SF-5 INV-109..111). A separate
  // effect that never touches the hex-write path — it only surfaces the resolved
  // NAME (never the hex) through the same `isResolvedNameMatch` guard, so the
  // emitted name and the written hex can never derive from divergent compares.
  const matchedName = isResolvedNameMatch ? resolvedName : undefined;
  useEffect(() => {
    onResolvedNameChange?.(matchedName);
  }, [matchedName, onResolvedNameChange]);

  const {
    containerRef,
    resolvedSuggestions,
    hasSuggestions,
    highlightedIndex,
    suggestionsDisabled,
    setHighlightedIndex,
    closeSuggestions,
    onInputChange,
    onContainerKeyDown,
  } = useAddressSuggestionField({ inputValue, suggestions: suggestionsProp });

  /**
   * The single site for the typed/raw write (the name→hex write lives in the
   * effect above). With no resolver this is the legacy write, verbatim (INV-82);
   * with a resolver, only the `name-candidate` classification diverges:
   *  - hex / malformed / empty → the raw value (legacy sync validate applies)
   *  - name-candidate → `''` — gates submit and synchronously invalidates any
   *    prior resolved hex before re-resolution (INV-75 / INV-81)
   */
  const commitTypedValue = useCallback(
    (value: string): void => {
      setInputValue(value);

      if (!resolverPresentRef.current) {
        // Legacy path — byte-identical (INV-82 part 1).
        lastSetValueRef.current = value;
        fieldOnChange(value);
        return;
      }

      const c = classifyAddressInput(value, { isValidAddress, isValidName });
      // Sync the validator's refs so a validation triggered by the write below
      // sees this keystroke's state immediately (INV-84).
      classificationRef.current = c;
      if (c === 'name-candidate') {
        // Same-normalized re-entry (e.g. 'alice.eth' → 'ALICE.ETH' / trailing
        // space): the resolution machine stays `resolved`, so clearing RHF to
        // '' would strand the form (UI still announces success, write-effect
        // deps unchanged → hex never rewritten). Keep the hex.
        const normalized = normalizeResolvedName(value);
        if (
          statusRef.current === 'resolved' &&
          resolvedNameRef.current === normalized &&
          !chainScopeBlockedRef.current
        ) {
          return;
        }
        statusRef.current = 'debouncing';
        lastSetValueRef.current = '';
        fieldOnChange('');
      } else {
        // hex / malformed / empty passthrough — identical to the legacy field (INV-82 part 2).
        lastSetValueRef.current = value;
        fieldOnChange(value);
      }
    },
    [fieldOnChange, isValidAddress, isValidName]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    commitTypedValue(e.target.value);
    onInputChange(e.target.value);
  };

  const applySuggestion = (suggestion: AddressSuggestion): void => {
    commitTypedValue(suggestion.value);
    onSuggestionSelect?.(suggestion);
    closeSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (hasSuggestions && e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      applySuggestion(resolvedSuggestions[highlightedIndex]);
      return;
    }

    if (e.key === 'Escape') {
      if (hasSuggestions) {
        closeSuggestions();
        return;
      }
      handleEscapeKey(commitTypedValue, inputValue)(e);
    }
  };

  // Distinguish a real validation error (shown, red, aria-invalid) from the
  // non-user-facing pending gate (neutral; the aria-live region shows "Resolving…").
  // With no resolver the gate can never be set, so these equal the legacy values (INV-82).
  const hasError = !!fieldState.error;
  const isPendingGate = fieldState.error?.message === NAME_RESOLUTION_PENDING_GATE;
  const hasRealError = hasError && !isPendingGate;
  const shouldShowError = hasRealError && fieldState.isTouched;
  const validationClasses = getValidationStateClasses(
    hasRealError ? fieldState.error : undefined,
    isPendingGate ? false : fieldState.isTouched
  );

  // Safely extract the pattern error message. The `pattern` validation rule can be either a
  // RegExp object or an object with a `value` (RegExp) and a `message` (string). This
  // type guard ensures we only try to access `.message` on the correct object type.
  const patternErrorMessage =
    validation?.pattern && typeof validation.pattern === 'object' && 'message' in validation.pattern
      ? (validation.pattern.message as string)
      : undefined;

  // Get accessibility attributes
  const accessibilityProps = getAccessibilityProps({
    id,
    hasError: hasRealError,
    isRequired,
    hasHelperText: !!helperText,
  });

  // INV-70 / INV-89: exactly one outcome per resolution state, each with a designed,
  // non-blank rendering. A single switch guarantees mutual exclusivity.
  const renderOutcome = (): React.ReactNode => {
    if (forwardUnsupported) {
      // INV-78: no runtime read inside ui-components — with no injected method
      // there is no result to source a network label from, so the message names
      // "this network" generically. No retry: definitive negative (INV-90).
      return (
        <span role="alert" className="text-destructive text-sm">
          {nameResolutionMessageForCode('UNSUPPORTED_NETWORK')}
        </span>
      );
    }
    switch (resolution.status) {
      case 'idle':
        return null;
      case 'debouncing':
      case 'loading':
        // INV-129 / INV-130: phase-1 then phase-2 loading copy — no mechanism words.
        return <span className="text-muted-foreground text-sm">{resolvingAnnouncerCopy}</span>;
      case 'resolved':
        // INV-137: chain-scope mismatch — utils-only message, no retry (INV-148).
        if (chainScopeBlocked) {
          return (
            <span role="alert" className="text-destructive text-sm">
              {nameResolutionChainScopeMismatchMessage({
                activeNetworkName,
              })}
            </span>
          );
        }
        const fallbackNetworks = isCrossNetworkFallback(resolution.data.provenance)
          ? getFallbackNetworks(resolution.data.provenance)
          : undefined;
        const fallbackMessage =
          showCrossNetworkFallbackDisclaimer &&
          fallbackNetworks &&
          nameResolutionCrossNetworkFallbackMessage(
            fallbackNetworks,
            crossNetworkFallbackMessageNames(fallbackNetworks, resolveNetworkLabel)
          );
        // INV-126 / INV-127 / INV-128: frozen mechanism-neutral success template.
        return (
          <span className="text-sm">
            <span>
              Resolved to <code className="font-mono">{resolution.data.address}</code>
            </span>
            {fallbackMessage ? (
              <span className="mt-1 block text-muted-foreground text-xs" role="note">
                {fallbackMessage}
              </span>
            ) : null}
          </span>
        );
      case 'error': {
        // INV-78: the network identifier comes from the injected result itself
        // (only UNSUPPORTED_NETWORK carries one) — never from the prop adapter,
        // never from a runtime read inside ui-components.
        const networkName =
          resolution.error.code === 'UNSUPPORTED_NETWORK'
            ? resolution.error.networkId || undefined
            : undefined;
        // INV-88 / INV-91: the code-derived message only — never a raw diagnostic field.
        const message = nameResolutionMessageForCode(resolution.error.code, { networkName });
        const isTransient = TRANSIENT_ERROR_CODES.has(resolution.error.code);
        const retry = resolution.retry;
        return (
          <span role="alert" className="text-destructive text-sm">
            {message}
            {/* INV-90: retry offered only for transient codes. */}
            {isTransient ? (
              <button type="button" className="ml-2 underline" onClick={retry}>
                Retry
              </button>
            ) : null}
          </span>
        );
      }
    }
  };

  return (
    <div
      className={`flex flex-col gap-2 ${width === 'full' ? 'w-full' : width === 'half' ? 'w-1/2' : 'w-1/3'}`}
    >
      {label && (
        <Label htmlFor={id}>
          {label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
      )}

      <div ref={containerRef} className="relative" onKeyDown={onContainerKeyDown}>
        <Input
          {...field}
          id={id}
          placeholder={placeholder || (resolver !== null ? '0x... or name' : '0x...')}
          className={validationClasses}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          data-slot="input"
          // INV-69: the input always shows the typed string — never the resolved hex.
          // Identical to binding `field.value` when no resolver is mounted (INV-82).
          value={inputValue}
          {...accessibilityProps}
          // INV-92: preserve the legacy describedby wiring verbatim when no resolver
          // is mounted; with a resolver, additively associate the dedicated
          // resolution announcer (never overwriting error/description).
          aria-describedby={
            resolver === null
              ? `${helperText ? descriptionId : ''} ${hasRealError ? errorId : ''}`
              : [helperText ? descriptionId : '', hasRealError ? errorId : '', resolutionRegionId]
                  .filter(Boolean)
                  .join(' ') || undefined
          }
          aria-expanded={hasSuggestions}
          aria-autocomplete={suggestionsDisabled ? undefined : 'list'}
          aria-controls={hasSuggestions ? `${id}-suggestions` : undefined}
          aria-activedescendant={
            hasSuggestions && highlightedIndex >= 0
              ? `${id}-suggestion-${highlightedIndex}`
              : undefined
          }
          disabled={readOnly}
        />

        {hasSuggestions && (
          <AddressSuggestionList
            id={id}
            suggestions={resolvedSuggestions}
            highlightedIndex={highlightedIndex}
            onSelect={applySuggestion}
            onHighlight={setHighlightedIndex}
          />
        )}
      </div>

      {/* Display helper text */}
      {helperText && (
        <div id={descriptionId} className="text-muted-foreground text-sm">
          {helperText}
        </div>
      )}

      {/* Display error message — unchanged; the pending gate string is suppressed. */}
      <ErrorMessage
        error={hasRealError ? fieldState.error : undefined}
        id={errorId}
        message={shouldShowError ? fieldState.error?.message || patternErrorMessage : undefined}
      />

      {/* INV-92: dedicated aria-live announcer, distinct from the RHF error region;
          absent entirely with no resolver (INV-82). Kept mounted while a resolver is
          present so live-region announcements are reliable. INV-93: it never steals
          focus — announcement is via aria-live only. */}
      {resolver !== null && (
        <div id={resolutionRegionId} aria-live="polite" className="min-h-5">
          {renderOutcome()}
        </div>
      )}
    </div>
  );
}

// Set displayName manually for better debugging
AddressField.displayName = 'AddressField';
