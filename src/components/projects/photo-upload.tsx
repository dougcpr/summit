import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { Camera } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { resizeImageToBlob } from "../../lib/image-resize";

interface PhotoUploadProps {
  onUploaded: (storageId: Id<"_storage">, previewUrl: string) => void;
}

type Status = "idle" | "uploading" | "done" | "error";

export function PhotoUpload({ onUploaded }: PhotoUploadProps) {
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setStatus("uploading");
    setErrorMsg(null);
    try {
      const blob = await resizeImageToBlob(file);
      const localUrl = URL.createObjectURL(blob);
      setPreviewUrl(localUrl);

      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };

      setStatus("done");
      onUploaded(storageId, localUrl);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const retake = () => {
    setStatus("idle");
    setPreviewUrl(null);
    setErrorMsg(null);
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      {status === "idle" ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[4/3] bg-card-bg border-2 border-dashed border-border/30 rounded-lg flex flex-col items-center justify-center text-border/60 active:brightness-95"
        >
          <Camera size={48} weight="bold" />
          <span className="mt-2 text-sm">Take or choose photo</span>
        </button>
      ) : (
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-card-bg">
          {previewUrl && (
            <img src={previewUrl} alt="Project" className="w-full h-full object-cover" />
          )}
          {status === "uploading" && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-white text-sm">Uploading…</span>
            </div>
          )}
          {status === "done" && (
            <button
              onClick={retake}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-card-bg text-border text-sm rounded-md active:brightness-95"
            >
              Retake
            </button>
          )}
        </div>
      )}
      {status === "error" && errorMsg && (
        <div className="mt-2 text-sm text-red-700">
          {errorMsg}{" "}
          <button onClick={retake} className="underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
