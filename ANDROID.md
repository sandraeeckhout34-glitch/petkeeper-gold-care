# PetKeeper — Android (Capacitor)

Deze map bevat een volledige Capacitor Android-schil rond de live
PetKeeper webapp. De WebView laadt `https://petkeeper-gold-care.lovable.app`.

## Openen in Android Studio

1. Installeer Android Studio (Ladybug of nieuwer) + Android SDK 34+.
2. Kloon dit project lokaal (GitHub → Code → Download / `git clone`).
3. `bun install` (of `npm install`).
4. `bun run cap:sync` — synchroniseert `capacitor.config.ts` naar `android/`.
5. `bun run cap:open` — opent `android/` in Android Studio.

## AAB bouwen (Google Play)

In Android Studio:

1. **Build → Generate Signed App Bundle / APK → Android App Bundle**.
2. Maak een nieuwe keystore aan (bewaar het `.jks`-bestand en het wachtwoord
   veilig — je hebt ze nodig voor élke update).
3. Kies **release** variant → **Finish**.
4. De `.aab` verschijnt in `android/app/release/`.

Upload deze `.aab` in Google Play Console onder je app → **Production →
Create new release**.

## App-configuratie

- `applicationId`: `app.lovable.petkeeper` — moet uniek zijn in Play Console.
  Wijzig in `android/app/build.gradle` én in `capacitor.config.ts` als je
  een andere ID wil.
- App-naam: `android/app/src/main/res/values/strings.xml` → `app_name`.
- Icoon: vervang `android/app/src/main/res/mipmap-*` PNG's met je eigen
  icoon (of gebruik Android Studio → Image Asset Studio).
- Versie: `android/app/build.gradle` → `versionCode` (integer, altijd
  verhogen) en `versionName` (bijv. `1.0.1`).

## Live URL wijzigen

Als je een custom domain koppelt in Lovable (Project Settings → Domains),
update dan `capacitor.config.ts` → `server.url` naar dat domein en run
`bun run cap:sync`.

## Belangrijk over Play Store review

Google keurt "pure WebView wrappers" vaak af. Voeg minstens één native
meerwaarde toe voordat je submit:

- Push notifications (`@capacitor/push-notifications`)
- Camera voor documenten (`@capacitor/camera`)
- Deep links / share intents

Installeer met `bun add @capacitor/push-notifications` en daarna
`bun run cap:sync`.