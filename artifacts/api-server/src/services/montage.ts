import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { logger } from "../lib/logger";

export async function buildMontage(
  audioUrls: string[],
  analysisId: string,
): Promise<string> {
  const dir = path.join(process.cwd(), "static", "audio", analysisId);
  fs.mkdirSync(dir, { recursive: true });

  const audioPaths = audioUrls
    .map((url) => {
      const filename = path.basename(url);
      return path.join(dir, filename);
    })
    .filter((p) => fs.existsSync(p));

  if (audioPaths.length === 0) {
    throw new Error("No valid audio files for montage");
  }

  const montageOut = path.join(dir, "montage.mp3");

  try {
    const silencePath = path.join(dir, "silence.mp3");
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 0.4 -acodec libmp3lame -q:a 4 "${silencePath}" 2>/dev/null`,
    );

    const listFile = path.join(dir, "concat_list.txt");
    const lines: string[] = [];
    for (const p of audioPaths) {
      lines.push(`file '${p}'`);
      lines.push(`file '${silencePath}'`);
    }
    fs.writeFileSync(listFile, lines.join("\n"));

    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -acodec libmp3lame -q:a 4 "${montageOut}" 2>/dev/null`,
    );

    fs.unlinkSync(silencePath);
    fs.unlinkSync(listFile);
  } catch (err) {
    logger.error({ err }, "ffmpeg montage failed");
    throw new Error("Failed to build audio montage");
  }

  return `/api/static/audio/${analysisId}/montage.mp3`;
}
