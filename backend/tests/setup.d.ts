declare global {
    var testUtils: {
        createTestUser: (overrides?: Partial<any>) => Promise<any>;
        createTestAdmin: (overrides?: Partial<any>) => Promise<any>;
        generateJWT: (payload: any) => string;
    };
}
export {};
//# sourceMappingURL=setup.d.ts.map