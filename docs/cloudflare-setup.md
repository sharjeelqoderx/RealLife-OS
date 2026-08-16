# Cloudflare administrator setup

1. Create a Cloudflare account and a Zero Trust organization.
2. Choose the organization team name and configure Cloudflare One Client/WARP
   enrollment permissions and an appropriate enrollment policy.
3. Configure the required WARP Access application and either an identity
   provider or Cloudflare One-Time PIN enrollment method. V1 uses normal
   user-authenticated enrollment; do not use a service token for normal
   customer devices.
4. Create a least-privilege API token with Zero Trust device read/write and
   Gateway rule read/write access. Add Access Apps and Policies write only when
   this application manages enrollment access configuration. Do not request
   broad account-wide permissions.
5. Set private server environment variables:

   ```env
   CLOUDFLARE_ACCOUNT_ID=
   CLOUDFLARE_API_TOKEN=
   CLOUDFLARE_TEAM_NAME=
   CLOUDFLARE_TEAM_DOMAIN=
   ```

   Never prefix these values with `NEXT_PUBLIC_`, add them to URLs, or return
   them from APIs.
6. Configure the default Cloudflare device profile as an administrator. Customer
   identity-scoped Gateway policies require **Traffic and DNS** client mode;
   DNS-only mode is not equivalent. Lock, auto-connect, logout restrictions,
   and MDM controls are Cloudflare/MDM administrator settings—not RealLife OS
   app preferences.
7. Test a WARP enrollment using a test SaaS account, then verify the physical
   device and Gateway DNS filtering from the RealLife OS dashboard.

Cloudflare dashboard access is for platform setup, emergency administration,
and debugging only—not for SaaS customers.
