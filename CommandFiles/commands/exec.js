// @ts-ignore

import { exec } from "child_process";

/**
 * @type {CassidySpectra.CommandMeta}
 */
export const meta = {
  name: "exec",
  otherNames: ["shell", "$", "terminal"],
  author: "Liane Cagara",
  version: "1.0.3",
  description: "Execute shell commands",
  usage: "{prefix}{name} <command>",
  category: "Utilities",
  permissions: [2],
  waitingTime: 5,
  botAdmin: true,
  noPrefix: false,
  whiteList: null,
  ext_plugins: {},
  requirement: "3.0.0",
  icon: ">_",
};

export const style = {
  title: "Terminal >_",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 * 
 * @param {CommandContext} ctx 
 * @returns 
 */
export async function entry({ output, input, AutoEdit }) {
  output.reaction("⏳");
  let auto = new AutoEdit();
  const command = input.arguments.join(" ");
  if (!command) {
    await output.reply("❌ Please provide a command to execute.");
    return;
  }
  let foo;
  if (!input.isWeb) {
    foo = await output.reply(`⚙️ Executing Command....`);
  }

  let result = "";

  const childProcess = exec(`${command}`, async (error, stdout, stderr) => {
    if (stdout) result += stdout;
    if (stderr) result += stderr;
    if (error) result += error;
    if (!input.isWeb) {
      //auto = await auto.addUp(result);
    }
  });

  childProcess.on("close", () => {
    output.reaction("✅");
    if (foo) {
      output.edit(
        `✅ Command executed successfully:\n\n${result}`,
        foo.messageID
      );
    } else {
      output.reply(`✅ Command executed successfully:\n\n${result}`);
    }
  });
}
