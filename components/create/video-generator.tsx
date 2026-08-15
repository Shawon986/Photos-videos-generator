"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dices } from "lucide-react";
import { PromptInput } from "@/components/create/prompt-input";
import { ModelSelector } from "@/components/create/model-selector";
import { AspectRatioSelector } from "@/components/create/aspect-ratio-selector";
import { GenerationButton } from "@/components/create/generation-button";
import { GenerationStage } from "@/components/create/generation-stage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const formSchema = z.object({
  prompt: z.string().trim().min(1, "Please describe the video you want to create.").max(2000),
  negativePrompt: z.string().max(1000).optional(),
  duration: z.number().int(),
  aspectRatio: z.string(),
  resolution: z.string(),
  model: z.string(),
  seed: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function VideoGenerator() {
  const config = useAppConfig();
  const prefill = useCreateStudio((s) => s.prefill);
  const clearPrefill = useCreateStudio((s) => s.clearPrefill);
  const runner = useGenerationRunner();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      negativePrompt: "",
      duration: 5,
      aspectRatio: "16:9",
      resolution: "512p",
      model: "auto",
      seed: "",
    },
  });

  React.useEffect(() => {
    if (prefill && !prefill.applied) {
      if (prefill.prompt) form.setValue("prompt", prefill.prompt);
      if (prefill.negativePrompt) form.setValue("negativePrompt", prefill.negativePrompt);
      if (prefill.model) form.setValue("model", prefill.model);
      if (prefill.aspectRatio) form.setValue("aspectRatio", prefill.aspectRatio);
      clearPrefill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const onSubmit = form.handleSubmit(async (values) => {
    await runner.submit("/api/generate/video", {
      prompt: values.prompt,
      negativePrompt: values.negativePrompt || undefined,
      duration: values.duration,
      aspectRatio: values.aspectRatio,
      resolution: values.resolution,
      model: values.model,
      seed: values.seed ? Number(values.seed) : undefined,
    });
  });

    const values = useWatch({ control: form.control });

  const errors = form.formState.errors;
  const videoMode = config.ai.video.mode;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <Card>
          <CardContent className="space-y-5 pt-6">
            {videoMode === "unavailable" ? (
              <div
                className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200"
                role="status"
              >
                Video generation is currently unavailable because no video provider is
                configured. Set <code className="font-mono text-xs">AI_VIDEO_URL</code> or{" "}
                <code className="font-mono text-xs">HUGGINGFACE_API_KEY</code>, or enable{" "}
                <code className="font-mono text-xs">DEMO_MODE</code>.
              </div>
            ) : null}

            <PromptInput
              id="video-prompt"
              label="Prompt"
              placeholder="Describe the video you want to create..."
              value={values.prompt ?? ""}
              onChange={(v) => form.setValue("prompt", v, { shouldValidate: true })}
              disabled={runner.submitting}
              autoFocus
            />
            {errors.prompt ? (
              <p className="text-sm text-red-400" role="alert">
                {errors.prompt.message}
              </p>
            ) : null}

            <PromptInput
              id="video-negative"
              label="Negative prompt"
              placeholder="What should be avoided?"
              value={values.negativePrompt ?? ""}
              onChange={(v) => form.setValue("negativePrompt", v)}
              maxLength={1000}
              disabled={runner.submitting}
            />

            <div className="space-y-2">
              <Label htmlFor="video-duration">Duration</Label>
              <Select
                value={String(values.duration ?? 5)}
                onValueChange={(v) => form.setValue("duration", Number(v))}
              >
                <SelectTrigger id="video-duration" aria-label="Duration">
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

            <AspectRatioSelector
              value={values.aspectRatio ?? "16:9"}
              onChange={(v) => form.setValue("aspectRatio", v)}
              options={config.options.videoAspectRatios}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="video-resolution">Resolution</Label>
                <Select
                  value={values.resolution ?? "512p"}
                  onValueChange={(v) => form.setValue("resolution", v)}
                >
                  <SelectTrigger id="video-resolution" aria-label="Resolution">
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
              <ModelSelector
                id="video-model"
                value={values.model ?? "auto"}
                onChange={(v) => form.setValue("model", v)}
                models={config.options.videoModels}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="video-seed" className="flex items-center gap-1.5">
                Seed
                <Dices className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </Label>
              <Input
                id="video-seed"
                type="number"
                min={0}
                placeholder="Random"
                {...form.register("seed")}
              />
            </div>

            <GenerationButton
              loading={runner.submitting}
              label="Generate Video"
              loadingLabel="Queueing video…"
            />

            <p className="text-xs text-muted-foreground">
              Video generation runs in the background — you can leave this page and find
              the result in your dashboard.
            </p>
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
