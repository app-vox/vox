import { useState, useEffect, useCallback } from "react";
import { useConfigStore } from "../stores/config-store";
import type { ModelInfo } from "../../preload/index";
import type { WhisperModelSize } from "../../shared/config";

export function useModelManager() {
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const loadConfig = useConfigStore((s) => s.loadConfig);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });

  const refreshModels = useCallback(async () => {
    const list = await window.voxApi.models.list();
    setModels(list);

    const currentConfig = useConfigStore.getState().config;
    if (!currentConfig) return;

    const configuredModel = currentConfig.whisper.model;
    const configuredAndDownloaded = list.find(
      (m) => m.size === configuredModel && m.downloaded
    );

    if (configuredAndDownloaded) {
      setSelectedSize(configuredAndDownloaded.size);
    } else {
      const firstDownloaded = list.find((m) => m.downloaded);
      if (firstDownloaded) {
        setSelectedSize(firstDownloaded.size);
        updateConfig({ whisper: { model: firstDownloaded.size as WhisperModelSize } });
        await saveConfig(false);
      } else {
        setSelectedSize("");
      }
    }
  }, [updateConfig, saveConfig]);

  useEffect(() => {
    refreshModels(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refreshModels]);

  useEffect(() => {
    const cleanup = window.voxApi.models.onDownloadProgress((p) => {
      if (downloading && p.size === downloading) {
        setProgress({ downloaded: p.downloaded, total: p.total });
        if (p.downloaded === p.total && p.total > 0) {
          setTimeout(() => {
            setDownloading(null);
            setProgress({ downloaded: 0, total: 0 });
            refreshModels();
            loadConfig();
            useConfigStore.getState().checkSetup();
          }, 100);
        }
      }
    });
    return cleanup;
  }, [downloading, refreshModels, loadConfig]);

  const select = useCallback(async (size: string) => {
    const model = models.find((m) => m.size === size);
    if (!model?.downloaded) return;
    setSelectedSize(size);
    updateConfig({ whisper: { model: size as WhisperModelSize } });
    await saveConfig(false);
  }, [models, updateConfig, saveConfig]);

  const download = useCallback(async (size: string) => {
    setDownloading(size);
    setProgress({ downloaded: 0, total: 0 });
    try {
      await window.voxApi.models.download(size);
      setSelectedSize(size);
      updateConfig({ whisper: { model: size as WhisperModelSize } });
      await saveConfig(false);
    } catch (err) {
      setDownloading(null);
      throw err;
    }
  }, [updateConfig, saveConfig]);

  const cancelDownload = useCallback(async () => {
    if (downloading) {
      await window.voxApi.models.cancelDownload(downloading);
      setDownloading(null);
      setProgress({ downloaded: 0, total: 0 });
    }
  }, [downloading]);

  const deleteModel = useCallback(async (size: string) => {
    await window.voxApi.models.delete(size);
    await refreshModels();
  }, [refreshModels]);

  return {
    models,
    selectedSize,
    downloading,
    progress,
    select,
    download,
    cancelDownload,
    deleteModel,
    refreshModels,
  };
}
