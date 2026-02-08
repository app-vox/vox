const { execSync } = require("child_process");
const path = require("path");

exports.default = async function notarize(context) {
  if (context.electronPlatformName !== "darwin") return;

  // In CI, electron-builder handles notarization natively via APPLE_API_KEY env var
  if (process.env.APPLE_API_KEY) {
    console.log("  • skipping afterSign notarization (electron-builder handles it in CI)");
    return;
  }

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

  // Local: uses keychain profile "vox-notarize"
  execSync(
    `xcrun notarytool submit "${zipPath}" --keychain-profile "vox-notarize" --wait`,
    { stdio: "inherit" }
  );

  // Staple the ticket to the app
  execSync(`xcrun stapler staple "${appPath}"`, { stdio: "inherit" });

  // Clean up zip
  execSync(`rm -f "${zipPath}"`);

  console.log("  • notarization complete");
};
