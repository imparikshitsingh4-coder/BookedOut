import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "supabase/.temp/**"],
  },
];

export default config;
