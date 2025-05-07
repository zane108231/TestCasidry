// @ts-check
/**
 * @type {CassidySpectra.CommandMeta}
 */
export const meta = {
  name: "threadid",
  description: "Check threadID",
  author: "Liane",
  version: "1.0.1",
  usage: "{prefix}{name}",
  category: "Utilities",
  permissions: [0],
  noPrefix: "both",
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["tid"],
  icon: "💬",
  noLevelUI: true,
};

import { defineEntry } from "@cass/define";

export const entry = defineEntry(async ({ input, output }) => {
  return output.reply(`${input.threadID}`);
});
