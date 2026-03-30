import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const doctorTailwindProjectMock = vi.fn();
const fixTailwindProjectMock = vi.fn();
const printTailwindProjectMock = vi.fn();
const printJsonMock = vi.fn();
const printErrorMock = vi.fn();
const printTailwindDoctorResultMock = vi.fn();
const printTailwindFixResultMock = vi.fn();
const printTailwindPrintResultMock = vi.fn();

vi.mock('../lib/tailwind/doctor', () => ({
  doctorTailwindProject: doctorTailwindProjectMock,
}));

vi.mock('../lib/tailwind/fix', () => ({
  fixTailwindProject: fixTailwindProjectMock,
  printTailwindProject: printTailwindProjectMock,
}));

vi.mock('../utils/logger', () => ({
  printJson: printJsonMock,
  printError: printErrorMock,
  printTailwindDoctorResult: printTailwindDoctorResultMock,
  printTailwindFixResult: printTailwindFixResultMock,
  printTailwindPrintResult: printTailwindPrintResultMock,
}));

describe('registerTailwindCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    doctorTailwindProjectMock.mockReturnValue({
      ok: true,
      projectRoot: '/tmp/app',
      appRoot: '/tmp/app/apps/example',
      cssPath: '/tmp/app/apps/example/src/index.css',
      generatedCssPath: '/tmp/app/apps/example/src/oz-tailwind.generated.css',
      sourcePlan: null,
      issues: [],
    });
    fixTailwindProjectMock.mockReturnValue({
      ok: true,
      projectRoot: '/tmp/app',
      appRoot: '/tmp/app/apps/example',
      cssPath: '/tmp/app/apps/example/src/index.css',
      generatedCssPath: '/tmp/app/apps/example/src/oz-tailwind.generated.css',
      sourcePlan: null,
      issuesBefore: [],
      changes: [],
      changed: false,
      wrote: false,
    });
    printTailwindProjectMock.mockReturnValue({
      ok: true,
      projectRoot: '/tmp/app',
      appRoot: '/tmp/app/apps/example',
      cssPath: '/tmp/app/apps/example/src/index.css',
      generatedCssPath: '/tmp/app/apps/example/src/oz-tailwind.generated.css',
      sourcePlan: {
        packages: [],
        appSources: ['./'],
        workspaceSources: [],
        packageSources: [],
        imports: [],
        sources: ['./'],
      },
    });
  });

  it('passes json doctor results through with the expected action name', async () => {
    const { registerTailwindCommand } = await import('./tailwind');
    const program = new Command();

    registerTailwindCommand(program);
    await program.parseAsync(
      ['node', 'oz-dev', 'tailwind', 'doctor', '--project', '/tmp/app', '--json'],
      { from: 'node' }
    );

    expect(doctorTailwindProjectMock).toHaveBeenCalledWith('/tmp/app', undefined);
    expect(printJsonMock).toHaveBeenCalledWith({
      action: 'tailwind-doctor',
      ok: true,
      projectRoot: '/tmp/app',
      appRoot: '/tmp/app/apps/example',
      cssPath: '/tmp/app/apps/example/src/index.css',
      generatedCssPath: '/tmp/app/apps/example/src/oz-tailwind.generated.css',
      sourcePlan: null,
      issues: [],
    });
    expect(printTailwindDoctorResultMock).not.toHaveBeenCalled();
  });

  it('passes dry-run and css overrides to tailwind fix', async () => {
    const { registerTailwindCommand } = await import('./tailwind');
    const program = new Command();

    registerTailwindCommand(program);
    await program.parseAsync(
      [
        'node',
        'oz-dev',
        'tailwind',
        'fix',
        '--project',
        '/tmp/app',
        '--css',
        'apps/example/src/index.css',
        '--dry-run',
      ],
      { from: 'node' }
    );

    expect(fixTailwindProjectMock).toHaveBeenCalledWith('/tmp/app', {
      cssPath: 'apps/example/src/index.css',
      dryRun: true,
    });
    expect(printTailwindFixResultMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true }),
      true
    );
  });

  it('prints the resolved source plan for tailwind print', async () => {
    const { registerTailwindCommand } = await import('./tailwind');
    const program = new Command();

    registerTailwindCommand(program);
    await program.parseAsync(['node', 'oz-dev', 'tailwind', 'print', '--project', '/tmp/app'], {
      from: 'node',
    });

    expect(printTailwindProjectMock).toHaveBeenCalledWith('/tmp/app', undefined);
    expect(printTailwindPrintResultMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
  });
});
