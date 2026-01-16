import { describe, expect, it } from 'vitest';

import type { WalletComponentSize, WalletComponentVariant } from '@openzeppelin/ui-types';

import {
  getWalletAccountDisplaySizeProps,
  getWalletButtonSizeProps,
  getWalletNetworkSwitcherSizeProps,
  getWalletNetworkSwitcherVariantClassName,
} from '../walletComponentSizing';

describe('walletComponentSizing', () => {
  describe('getWalletButtonSizeProps', () => {
    it('should return correct props for "sm" size', () => {
      const result = getWalletButtonSizeProps('sm');
      expect(result).toEqual({
        size: 'sm',
        className: 'h-7 px-2 text-[11px]',
        iconSize: 'size-3',
      });
    });

    it('should return correct props for "default" size', () => {
      const result = getWalletButtonSizeProps('default');
      expect(result).toEqual({
        size: 'default',
        className: 'h-9 px-4 text-sm',
        iconSize: 'size-4',
      });
    });

    it('should return correct props for "lg" size', () => {
      const result = getWalletButtonSizeProps('lg');
      expect(result).toEqual({
        size: 'lg',
        className: 'h-11 px-5',
        iconSize: 'size-5',
      });
    });

    it('should return correct props for "xl" size', () => {
      const result = getWalletButtonSizeProps('xl');
      expect(result).toEqual({
        size: 'lg',
        className: 'h-12 px-6 text-base',
        iconSize: 'size-5',
      });
    });

    it('should return default props when size is undefined', () => {
      const result = getWalletButtonSizeProps(undefined);
      expect(result).toEqual({
        size: 'default',
        className: 'h-9 px-4 text-sm',
        iconSize: 'size-4',
      });
    });

    it('should handle all valid WalletComponentSize values', () => {
      const sizes: WalletComponentSize[] = ['sm', 'default', 'lg', 'xl'];
      sizes.forEach((size) => {
        const result = getWalletButtonSizeProps(size);
        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('className');
        expect(result).toHaveProperty('iconSize');
      });
    });
  });

  describe('getWalletAccountDisplaySizeProps', () => {
    it('should return correct props for "sm" size', () => {
      const result = getWalletAccountDisplaySizeProps('sm');
      expect(result).toEqual({
        textSize: 'text-[11px]',
        subTextSize: 'text-[8px]',
        iconButtonSize: 'size-5',
        iconSize: 'size-3',
      });
    });

    it('should return correct props for "default" size', () => {
      const result = getWalletAccountDisplaySizeProps('default');
      expect(result).toEqual({
        textSize: 'text-xs',
        subTextSize: 'text-[9px]',
        iconButtonSize: 'size-6',
        iconSize: 'size-3.5',
      });
    });

    it('should return correct props for "lg" size', () => {
      const result = getWalletAccountDisplaySizeProps('lg');
      expect(result).toEqual({
        textSize: 'text-base',
        subTextSize: 'text-xs',
        iconButtonSize: 'size-8',
        iconSize: 'size-4',
      });
    });

    it('should return correct props for "xl" size', () => {
      const result = getWalletAccountDisplaySizeProps('xl');
      expect(result).toEqual({
        textSize: 'text-lg',
        subTextSize: 'text-sm',
        iconButtonSize: 'size-10',
        iconSize: 'size-5',
      });
    });

    it('should return default props when size is undefined', () => {
      const result = getWalletAccountDisplaySizeProps(undefined);
      expect(result).toEqual({
        textSize: 'text-xs',
        subTextSize: 'text-[9px]',
        iconButtonSize: 'size-6',
        iconSize: 'size-3.5',
      });
    });

    it('should have distinct values for sm and default sizes', () => {
      const smResult = getWalletAccountDisplaySizeProps('sm');
      const defaultResult = getWalletAccountDisplaySizeProps('default');
      expect(smResult).not.toEqual(defaultResult);
    });
  });

  describe('getWalletNetworkSwitcherSizeProps', () => {
    it('should return correct props for "sm" size', () => {
      const result = getWalletNetworkSwitcherSizeProps('sm');
      expect(result).toEqual({
        triggerClassName: 'h-8 text-xs px-2 min-w-[90px] max-w-[120px]',
        itemClassName: 'text-xs py-1.5',
        loaderSize: 'h-3 w-3',
      });
    });

    it('should return correct props for "default" size', () => {
      const result = getWalletNetworkSwitcherSizeProps('default');
      expect(result).toEqual({
        triggerClassName: 'h-9 text-sm px-3 min-w-[100px] max-w-[150px]',
        itemClassName: 'text-sm py-1.5',
        loaderSize: 'h-3.5 w-3.5',
      });
    });

    it('should return correct props for "lg" size', () => {
      const result = getWalletNetworkSwitcherSizeProps('lg');
      expect(result).toEqual({
        triggerClassName: 'h-10 text-sm px-3 min-w-[120px] max-w-[180px]',
        itemClassName: 'text-sm py-2',
        loaderSize: 'h-4 w-4',
      });
    });

    it('should return correct props for "xl" size', () => {
      const result = getWalletNetworkSwitcherSizeProps('xl');
      expect(result).toEqual({
        triggerClassName: 'h-12 text-base px-4 min-w-[140px] max-w-[200px]',
        itemClassName: 'text-base py-2.5',
        loaderSize: 'h-5 w-5',
      });
    });

    it('should return default props when size is undefined', () => {
      const result = getWalletNetworkSwitcherSizeProps(undefined);
      expect(result).toEqual({
        triggerClassName: 'h-9 text-sm px-3 min-w-[100px] max-w-[150px]',
        itemClassName: 'text-sm py-1.5',
        loaderSize: 'h-3.5 w-3.5',
      });
    });

    it('should have distinct triggerClassName for each size', () => {
      const sizes: WalletComponentSize[] = ['sm', 'default', 'lg', 'xl'];
      const classNames = sizes.map(
        (size) => getWalletNetworkSwitcherSizeProps(size).triggerClassName
      );
      const uniqueClassNames = new Set(classNames);
      expect(uniqueClassNames.size).toBe(sizes.length);
    });
  });

  describe('getWalletNetworkSwitcherVariantClassName', () => {
    it('should return correct class for "ghost" variant', () => {
      const result = getWalletNetworkSwitcherVariantClassName('ghost');
      expect(result).toBe('border-transparent bg-transparent hover:bg-accent');
    });

    it('should return correct class for "secondary" variant', () => {
      const result = getWalletNetworkSwitcherVariantClassName('secondary');
      expect(result).toBe('border-secondary bg-secondary/10 hover:bg-secondary/20');
    });

    it('should return correct class for "outline" variant', () => {
      const result = getWalletNetworkSwitcherVariantClassName('outline');
      expect(result).toBe('border-input bg-transparent hover:bg-accent');
    });

    it('should return empty string for "default" variant', () => {
      const result = getWalletNetworkSwitcherVariantClassName('default');
      expect(result).toBe('');
    });

    it('should return empty string when variant is undefined', () => {
      const result = getWalletNetworkSwitcherVariantClassName(undefined);
      expect(result).toBe('');
    });

    it('should handle all valid WalletComponentVariant values', () => {
      const variants: WalletComponentVariant[] = ['default', 'outline', 'ghost', 'secondary'];
      variants.forEach((variant) => {
        const result = getWalletNetworkSwitcherVariantClassName(variant);
        expect(typeof result).toBe('string');
      });
    });
  });
});
