// src/modules/auth/identity-provider/identity-provider.interface.ts

export interface VerifiedIdentity {
    provider: string;           // 'oidc', 'auth0', 'cognito', 'clerk', 'supabase', 'mock'
    providerUserId: string;     // sub claim from IdP token
    email: string;              // email claim
    name?: string;              // name / nickname claim
    emailVerified?: boolean;
    roles?: string[];
    rawClaims: Record<string, any>;
}

export interface IIdentityProvider {
    readonly providerName: string;
    verifyToken(token: string): Promise<VerifiedIdentity>;
    resolveIdentity(token: string): Promise<VerifiedIdentity>;
}
