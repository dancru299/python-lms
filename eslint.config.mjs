import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Dấu " trong text JSX render bình thường; rule này chỉ gây nhiễu.
      "react/no-unescaped-entities": "off",
      // Cho phép biến/tham số cố tình bỏ qua khi đặt tiền tố "_".
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
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
