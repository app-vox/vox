.PHONY: release run dev build build-dev install deploy uninstall

UNAME := $(shell uname -s)

release: build deploy

install:
	@which cmake > /dev/null 2>&1 || (echo "cmake is required. See https://cmake.org/download"; exit 1)
	npm install

ifeq ($(UNAME),Darwin)
build:
	npm run dist

build-dev:
	npm run build && CSC_IDENTITY_AUTO_DISCOVERY=false SKIP_NOTARIZE=1 npx electron-builder --mac dir -c.mac.provisioningProfile=
	@printf 'provider: github\nowner: app-vox\nrepo: vox\n' > dist/mac-arm64/Vox.app/Contents/Resources/app-update.yml

deploy:
	@APP=$$(find dist -maxdepth 2 -name 'Vox.app' -type d 2>/dev/null | head -1); \
	if [ -z "$$APP" ]; then echo "Vox.app not found in dist/. Run 'make build' first."; exit 1; fi; \
	cp -R "$$APP" /Applications/Vox.app; \
	open /Applications/Vox.app

uninstall:
	rm -rf /Applications/Vox.app
else
build:
	-cmd //c "taskkill /F /IM Vox.exe /T" 2>/dev/null; sleep 1
	npm run dist

build-dev:
	npm run build && npx electron-builder --win dir

deploy:
	@EXE=$$(find dist -maxdepth 2 -name 'Vox.exe' -type f 2>/dev/null | head -1); \
	if [ -z "$$EXE" ]; then echo "Vox.exe not found in dist/. Run 'make build' first."; exit 1; fi; \
	echo "Starting $$EXE"; \
	"$$EXE" &

uninstall:
	-cmd //c "taskkill /F /IM Vox.exe /T" 2>/dev/null
endif

run: install
	npm run start

dev: install
	npm run dev
