# iOS cloud build preparation

The existing application is native SwiftUI, not a Capacitor project. Preserve it rather than replacing it with a web wrapper. The website/backend remains the contract source; SwiftUI screens require their own updates. The iOS installation archive is an **IPA**.

Confirmed existing identifiers:

- Bundle ID: `app.cridergpt.ios`
- App Store Connect app ID shown by the owner: `6779398024`
- Plus subscription: `cridergpt_plus_monthly`
- Pro subscription: `cridergpt_pro_monthly`

`project.yml` adds the missing Xcode application wrapper using the existing sources, dependencies and Info.plist. `Package.swift` is retained. No production backend, store products, payments or website configuration is changed.

## First cloud compilation

After this branch is reviewed and merged, open GitHub Actions → **iOS simulator build check** → Run workflow. This manually runs a macOS build without certificates, store uploads or signing secrets. The workflow is intentionally manual to avoid spending build minutes on every website edit. It checks configuration, generates the app project and compiles for an iOS simulator. A failed run is a real blocker to fix, not evidence that the project is complete. No installable iPhone IPA is produced by this check.

Standard GitHub-hosted runners are free for public repositories; private repositories have account-specific allowances and potential charges. Verify repository visibility and billing before running. Do not make a private repository public just to obtain builds. Reference: https://docs.github.com/en/actions/reference/runners/github-hosted-runners

Linux validation: `python3 ios_app/scripts/validate_config.py`. Full iOS compilation was not executed on this Ubuntu server. Dependencies currently retain the existing version ranges; commit the resolved dependency lock after the first verified macOS build. CI toolchain selection needs reviewing before release.

## Before a signed TestFlight IPA

A separate signed archive/export workflow needs Apple team ID, distribution signing certificate/private key, an appropriate provisioning profile for this bundle ID and capabilities, and an authorized App Store Connect upload credential. Configure these through the selected builder's protected secrets store. Never paste credentials in chat, commit them, or run them on untrusted PRs. Add icons, verify entitlements for Apple sign-in/NFC/push, replace existing Google OAuth placeholders, review privacy disclosures, then test on an actual device. No claim of App Store acceptance is made.

## Payment release blockers found during inspection

`supabase/functions/verify-iap/index.ts` begins with duplicated/malformed imports inside a function and is not a valid deployable verifier as checked in. Existing native purchase handling finishes transactions even if backend sync fails; restore handling also needs server reconciliation. A verified, account-bound Apple transaction pipeline, notification handling, subscription expiry/refund/revocation and sandbox purchase/restore testing are required before enabling sales. This preparation deliberately does not change production billing or grant premium access based solely on client claims.

The screenshot ranks Plus above Pro. If Pro provides the higher service tier, rank Pro at level 1 and Plus below it in App Store Connect. Confirm the tier definitions before changing the store. Apple's level 1 means the highest service level: https://developer.apple.com/documentation/storekit/product/subscriptioninfo/grouplevel

The older repository-wide `IOS_BUILD_GUIDE.md` describes Capacitor/EAS steps despite this native SwiftUI tree. Use this file for this build path; do not run both stacks or assume that guide has been validated.
