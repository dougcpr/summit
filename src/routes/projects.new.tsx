import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CaretLeft } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GRADES } from "../lib/grades";
import { PhotoUpload } from "../components/projects/photo-upload";

export const Route = createFileRoute("/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const create = useMutation(api.projects.create);

  const [photoStorageId, setPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("V5");
  const [holdType, setHoldType] = useState<"jug" | "crimp" | "sloper">("crimp");
  const [creating, setCreating] = useState(false);

  const canCreate = !!photoStorageId && name.trim().length > 0 && !creating;

  const handleCreate = async () => {
    if (!photoStorageId) return;
    setCreating(true);
    try {
      const id = await create({
        name: name.trim(),
        grade,
        holdType,
        photoStorageId,
      });
      navigate({ to: "/projects/$projectId", params: { projectId: id }, search: { status: "active" } });
    } catch (err) {
      setCreating(false);
      alert(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  return (
    <div className="px-4 pt-4 pb-8 font-display max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/projects", search: { status: "active" } })}
          className="p-1 active:brightness-90"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
        <h1 className="text-xl font-bold text-border">New project</h1>
      </div>

      <div>
        <p className="text-xs uppercase text-muted mb-2">1. Photo</p>
        <PhotoUpload onUploaded={(id) => setPhotoStorageId(id)} />
      </div>

      <div>
        <p className="text-xs uppercase text-muted mb-2">2. Name</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Slab project"'
          className="w-full p-3 rounded-md bg-card-bg border border-border/20 text-border"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase text-muted mb-2">3. Grade</p>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full p-3 rounded-md bg-card-bg border border-border/20 text-border"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase text-muted mb-2">Hold type</p>
          <select
            value={holdType}
            onChange={(e) => setHoldType(e.target.value as "jug" | "crimp" | "sloper")}
            className="w-full p-3 rounded-md bg-card-bg border border-border/20 text-border"
          >
            <option value="jug">Jug</option>
            <option value="crimp">Crimp</option>
            <option value="sloper">Sloper</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className="w-full py-4 rounded-lg bg-primary text-border font-bold active:brightness-90 disabled:opacity-30"
      >
        Create project
      </button>
    </div>
  );
}
