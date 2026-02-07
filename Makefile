.PHONY: release run build install uninstall

release: build uninstall install

build:
	npm run dist

install:
	mv dist/mac-arm64/Vox.app /Applications
	open /Applications/Vox.app

uninstall:
	rm -rf /Applications/Vox.app

run:
	npm run start
