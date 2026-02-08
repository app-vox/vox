const { execSync } = require("child_process");
const path = require("path");

exports.default = async function notarize(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  console.log(`  • notarizing       ${appPath}`);

  // Create a zip for submission
  const zipPath = path.join(context.appOutDir, "Vox-notarize.zip");
  execSync(`ditto -c -k --keepParent "${appPath}" "${zipPath}"`, {
    stdio: "inherit",
  });

  // Build the notarytool command based on environment:
  // - CI: uses App Store Connect API key (env vars APPLE_API_KEY_ID, APPLE_API_ISSUER_ID)
  // - Local: uses keychain profile "vox-notarize"
  const apiKeyId = process.env.APPLE_API_KEY_ID;
  const apiIssuerId = process.env.APPLE_API_ISSUER_ID;

  let submitCmd;
  if (apiKeyId && apiIssuerId) {
    console.log("  • using App Store Connect API key for notarization");
    submitCmd = `xcrun notarytool submit "${zipPath}" --key ~/private_keys/AuthKey_${apiKeyId}.p8 --key-id "${apiKeyId}" --issuer "${apiIssuerId}" --wait`;
  } else {
    console.log("  • using keychain profile for notarization");
    submitCmd = `xcrun notarytool submit "${zipPath}" --keychain-profile "vox-notarize" --wait`;
  }

  execSync(submitCmd, { stdio: "inherit" });

  // Staple the ticket to the app
  execSync(`xcrun stapler staple "${appPath}"`, { stdio: "inherit" });

  // Clean up zip
  execSync(`rm -f "${zipPath}"`);

  console.log("  • notarization complete");
};
