# Supabase Configuration Instructions - KRITISK SETUP

## 🚨 VIGTIG: Deaktiver Email Bekræftelse

Du **SKAL** deaktivere email bekræftelse i Supabase for at appen fungerer korrekt.

### Trin-for-trin guide:

1. **Gå til Supabase Dashboard**:
   - Åbn https://supabase.com/dashboard
   - Log ind og vælg dit projekt: `smprpytaezlktwfpdycq`

2. **Naviger til Authentication indstillinger**:
   - Klik på `Authentication` i venstre menu
   - Klik på `Settings` fanen

3. **Deaktiver Email Bekræftelse**:
   - Find sektionen `User Signups`
   - Find indstillingen `Enable email confirmations`
   - **Sæt den til OFF** (deaktiveret)
   - Klik `Save` for at gemme ændringerne

4. **Verificer indstillingerne**:
   - Refresh din browser
   - Bekræft at `Enable email confirmations` stadig er OFF

## Hvis du ikke kan deaktivere email bekræftelse:

### Manual bruger bekræftelse:
1. Gå til `Authentication` > `Users` i Supabase Dashboard
2. Find den nye bruger efter registrering
3. Klik på brugerens email
4. Klik `Confirm User` knappen

### Alternativ løsning:
Hvis email bekræftelse er påkrævet på din Supabase plan:
1. Opsæt SMTP indstillinger i Supabase
2. Eller opgrader til en plan der tillader deaktivering af email bekræftelse

## Test efter opsætning:
1. Prøv at registrere en ny bruger
2. Du skal ikke modtage en bekræftelses email
3. Brugeren skal automatisk være logget ind
