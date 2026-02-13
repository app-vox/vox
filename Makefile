.PHONY: release run dev build build-dev install uninstall

release: build uninstall install

build:
	npm run dist

build-dev:
	npm run build && CSC_IDENTITY_AUTO_DISCOVERY=false SKIP_NOTARIZE=1 npx electron-builder --mac dir
	@printf 'provider: github\nowner: app-vox\nrepo: vox\n' > out/mac-arm64/Vox.app/Contents/Resources/app-update.yml

install:
	@APP=$$(find out -maxdepth 2 -name 'Vox.app' -type d 2>/dev/null | head -1); \
	if [ -z "$$APP" ]; then echo "Vox.app not found in out/. Run 'make build' first."; exit 1; fi; \
	cp -R "$$APP" /Applications/Vox.app; \
	open /Applications/Vox.app

uninstall:
	rm -rf /Applications/Vox.app

run:
	npm run start

dev:
	npm run dev
