import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/**",
      "public/**",
      "next-env.d.ts",
      // File tạm/clutter ở root, không phải mã ứng dụng.
      "tmp-*.ts",
      "tmp-*.mjs",
    ],
  },
];

export default eslintConfig;
