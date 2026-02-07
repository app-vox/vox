.PHONY: release

release:
	npm run dist
	mv dist/mac-arm64/Vox.app /Applications/Vox.app
	open /Applications/Vox.app
