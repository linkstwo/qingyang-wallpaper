# Verified candidate delivery

Read current build/signing instructions and latest result; never hardcode an old APK hash/version as the next candidate. Reuse an existing candidate if it already contains the exact desired source/assets. Keep the original key and package. Fetch the uploaded key only when required, outside Git; never print secrets. Missing key does not authorise generating a replacement.

1. Freeze relevant app inputs at a committed source version. Increment version only for a real new candidate. Check regenerated assets, their native layout guard and relevant CPU/GLES/lifecycle regressions. Mark phone/subjective checks pending without a real device.
2. Build release with the existing toolchain/settings and required checks. Preserve a reproducible build report. Do not restore the entire toolchain if an exact verified candidate already exists.
3. Align, sign with original key and verify signature/certificate, version/package, release-not-debug, ZIP CRC/alignment and actual packaged inputs. Check unsigned/tampered negatives where the signing path changes.
4. Save the installable APK durably. Prefer the already established GitHub release direct download; retain Library backup when available. Never commit the private key/password. Verify a real public download and its SHA256; an existing URL alone is not success.
5. Update START_IN_CLOUD/EXECUTION_STATE/build result with actual source commit, version, digest, certificate, asset URL and checks. Deliver the link immediately. Keep incomplete stages/phone checks explicit. A release workflow can run separately, but only describe it as active after verifying its run status.
