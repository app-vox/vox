.PHONY: release run dev build build-dev install index deploy uninstall start stop embeddings embeddings-stop _chunkhound-index _install-hooks

UNAME := $(shell uname -s)

release: build deploy

install:
	@which cmake > /dev/null 2>&1 || (echo "cmake is required. See https://cmake.org/download"; exit 1)
	@which uv > /dev/null 2>&1 && uv tool install chunkhound --quiet 2>/dev/null || true
	npm install
	@$(MAKE) --no-print-directory _install-hooks
	@$(MAKE) --no-print-directory index

index:
	@$(MAKE) --no-print-directory _chunkhound-index

start: dev

stop:
	@echo "Stopping Vox dev processes..."; \
	if [ "$$(uname -s)" = "Darwin" ]; then \
		pkill -f "electron-vite dev" 2>/dev/null || true; \
		pkill -f "vite.*renderer" 2>/dev/null || true; \
		pkill -f "Electron.*Vox" 2>/dev/null || true; \
	else \
		taskkill //F //IM node.exe 2>/dev/null || true; \
		taskkill //F //IM Vox.exe 2>/dev/null || true; \
	fi; \
	echo "Stopped"
	@$(MAKE) --no-print-directory embeddings-stop

embeddings:
	@if [ "$$(uname -s)" != "Darwin" ]; then \
		echo "Ollama auto-start is macOS only. Install Ollama manually: https://ollama.com"; \
		exit 1; \
	fi; \
	if ! which ollama > /dev/null 2>&1; then \
		echo "Ollama not found. Install: brew install ollama"; \
		exit 1; \
	fi; \
	if curl -s http://localhost:11434/ > /dev/null 2>&1; then \
		echo "Ollama is already running on :11434"; \
	else \
		echo "Starting Ollama..."; \
		ollama serve > /dev/null 2>&1 & \
		sleep 2; \
		echo "Ollama started on :11434"; \
	fi; \
	if ! ollama list 2>/dev/null | grep -q "nomic-embed-text"; then \
		echo "Pulling nomic-embed-text model (for semantic search)..."; \
		ollama pull nomic-embed-text; \
	fi
	@$(MAKE) --no-print-directory index

embeddings-stop:
	@pkill -x ollama 2>/dev/null && echo "Ollama stopped" || echo "Ollama not running"

_chunkhound-index:
	@if ! which chunkhound > /dev/null 2>&1; then exit 0; fi; \
	HAS_SEMANTIC=0; \
	OLLAMA_STARTED=0; \
	if [ "$$(uname -s)" = "Darwin" ] && which ollama > /dev/null 2>&1 && ollama list 2>/dev/null | grep -q "nomic-embed-text"; then \
		HAS_SEMANTIC=1; \
		if ! curl -s http://localhost:11434/ > /dev/null 2>&1; then \
			printf "  → Starting Ollama for indexing (macOS only)...\n"; \
			ollama serve > /dev/null 2>&1 & \
			sleep 2; \
			OLLAMA_STARTED=1; \
		fi; \
	fi; \
	if [ ! -d ".chunkhound" ]; then \
		printf "\n  → Indexing codebase for AI code search (first time)...\n"; \
		if [ $$HAS_SEMANTIC -eq 1 ]; then \
			chunkhound index . 2>/dev/null \
				&& printf "  → Done. Semantic + regex search enabled.\n" \
				|| printf "  → Indexing failed, skipping.\n"; \
		else \
			printf "  → Semantic search unavailable"; \
			if [ "$$(uname -s)" = "Darwin" ]; then \
				printf " — run: brew install ollama && ollama pull nomic-embed-text\n"; \
			else \
				printf " (macOS only)\n"; \
			fi; \
			chunkhound index . --no-embeddings 2>/dev/null \
				&& printf "  → Done. Regex search enabled.\n" \
				|| printf "  → Indexing failed, skipping.\n"; \
		fi; \
	else \
		if [ $$HAS_SEMANTIC -eq 1 ]; then \
			chunkhound index . 2>/dev/null || true; \
		else \
			chunkhound index . --no-embeddings 2>/dev/null || true; \
		fi; \
	fi; \
	if [ $$OLLAMA_STARTED -eq 1 ]; then \
		pkill -x ollama > /dev/null 2>&1 || true; \
	fi

_install-hooks:
	@git config core.hooksPath .githooks 2>/dev/null || true
	@chmod +x .githooks/post-checkout .githooks/post-merge 2>/dev/null || true
	@printf "  → Git hooks configured (.githooks/).\n"

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
