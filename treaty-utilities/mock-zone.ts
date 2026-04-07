if (typeof (globalThis as any).Zone === 'undefined') {
    function mockRun<T>(fn: (...args: any[]) => T, applyThis?: any, applyArgs?: any): T {
      return fn.apply(applyThis, applyArgs);
    }
    const mockZone = {
      current: {
        get: (key: string): boolean | undefined =>
          key === 'isAngularZone' ? true : undefined,
        run: mockRun,
      },
      root: {
        run: mockRun,
      },
      run: mockRun,
    };
    (globalThis as any).Zone = mockZone;
  }