.PHONY: release run build install uninstall

release: build uninstall install

build:
	npm run dist

install:
	@APP=$$(find out -maxdepth 2 -name 'Vox.app' -type d 2>/dev/null | head -1); \
	if [ -z "$$APP" ]; then echo "Vox.app not found in out/. Run 'make build' first."; exit 1; fi; \
	cp -R "$$APP" /Applications/Vox.app; \
	open /Applications/Vox.app

uninstall:
	rm -rf /Applications/Vox.app

run:
	npm run start
