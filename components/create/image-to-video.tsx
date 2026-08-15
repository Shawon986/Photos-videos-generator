"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PromptInput } from "@/components/create/prompt-input";
import { ModelSelector } from "@/components/create/model-selector";
import { AspectRatioSelector } from "@/components/create/aspect-ratio-selector";
import { GenerationButton } from "@/components/create/generation-button";
import { GenerationStage } from "@/components/create/generation-stage";
import { UploadDropzone } from "@/components/create/upload-dropzone";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useGenerationRunner } from "@/lib/hooks/use-generation-runner";
import { useAppConfig } from "@/lib/config-context";
import { useCreateStudio } from "@/lib/store/create-store";
import type { UploadAccepted } from "@/lib/api-client";

const EXAMPLE_PROMPT =
  "Slow cinematic camera movement toward the subject, subtle wind moving the hair and clothing, realistic lighting.";

const formSchema = z.object({
  prompt: z.string().trim().min(1, "Describe how the image should animate.").max(2000),
  negativePrompt: z.string().max(1000).optional(),
  duration: z.number().int(),
  motionStrength: z.number().min(1).max(10),
  aspectRatio: z.string(),
  resolution: z.string(),
  model: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function ImageToVideoGenerator() {
  const config = useAppConfig();
  const prefill = useCreateStudio((s) => s.prefill);
  const clearPrefill = useCreateStudio((s) => s.clearPrefill);
  const runner = useGenerationRunner();
  const [upload, setUpload] = React.useState<UploadAccepted | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      negativePrompt: "",
      duration: 5,
      motionStrength: 5,
      aspectRatio: "16:9",
      resolution: "512p",
      model: "auto",
    },
  });

  React.useEffect(() => {
    if (prefill && !prefill.applied) {
      if (prefill.prompt) form.setValue("prompt", prefill.prompt);
      if (prefill.model) form.setValue("model", prefill.model);
      clearPrefill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!upload) {
      form.setError("prompt", { type: "manual", message: "Please upload an image first." });
      return;
    }
    await runner.submit("/api/generate/image-to-video", {
      prompt: values.prompt,
      negativePrompt: values.negativePrompt || undefined,
      imageFileId: upload.fileId,
      duration: values.duration,
      motionStrength: values.motionStrength,
      aspectRatio: values.aspectRatio,
      resolution: values.resolution,
      model: values.model,
    });
  });

    const values = useWatch({ control: form.control });

  const errors = form.formState.errors;
  const missingUpload = form.formState.errors.prompt?.message?.includes("upload");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-1.5">
              <Label>Source image</Label>
              <UploadDropzone fileId={upload?.fileId ?? null} onChange={setUpload} />
              <p className="text-xs text-muted-foreground">
                Upload an image to bring to life with motion.
              </p>
            </div>

            <PromptInput
              id="i2v-prompt"
              label="Animation prompt"
              placeholder={EXAMPLE_PROMPT}
              value={values.prompt ?? ""}
              onChange={(v) => form.setValue("prompt", v, { shouldValidate: true })}
              disabled={runner.submitting}
            />
            {missingUpload ? (
              <p className="text-sm text-red-400" role="alert">
                Please upload an image first.
              </p>
            ) : errors.prompt ? (
              <p className="text-sm text-red-400" role="alert">
                {errors.prompt.message}
              </p>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="motion-strength">Motion strength</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {(values.motionStrength ?? 5)}/10
                </span>
              </div>
              <Slider
                id="motion-strength"
                min={1}
                max={10}
                step={1}
                value={[values.motionStrength ?? 5]}
                onValueChange={([v]) => form.setValue("motionStrength", v)}
                aria-label="Motion strength"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="i2v-duration">Duration</Label>
                <Select
                  value={String(values.duration ?? 5)}
                  onValueChange={(v) => form.setValue("duration", Number(v))}
                >
                  <SelectTrigger id="i2v-duration" aria-label="Duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.options.videoDurations.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} seconds
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i2v-resolution">Resolution</Label>
                <Select
                  value={values.resolution ?? "512p"}
                  onValueChange={(v) => form.setValue("resolution", v)}
                >
                  <SelectTrigger id="i2v-resolution" aria-label="Resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.options.videoResolutions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AspectRatioSelector
              value={values.aspectRatio ?? "16:9"}
              onChange={(v) => form.setValue("aspectRatio", v)}
              options={config.options.videoAspectRatios}
            />

            <ModelSelector
              id="i2v-model"
              value={values.model ?? "auto"}
              onChange={(v) => form.setValue("model", v)}
              models={config.options.imageToVideoModels}
            />

            <GenerationButton
              loading={runner.submitting}
              label="Animate Image"
              loadingLabel="Queueing animation…"
              disabled={!upload}
            />
          </CardContent>
        </Card>
      </form>

      <div>
        <GenerationStage
          generation={runner.generation}
          loading={runner.loading}
          cancelling={runner.cancelling}
          regenerating={runner.regenerating}
          onCancel={runner.cancel}
          onRegenerate={(variation) => void runner.regenerate(runner.generation, variation)}
          onRetry={() => void runner.regenerate(runner.generation, false)}
          onDeleted={runner.reset}
        />
      </div>
    </div>
  );
}
