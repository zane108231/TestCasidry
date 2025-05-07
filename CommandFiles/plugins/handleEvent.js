export const meta = {
  name: "handleEvent",
  author: "Liane Cagara",
  description: "Self explanatory.",
  version: "1.0.1",
  supported: "^1.0.0",
  type: "plugin",
  order: 900,
  after: ["replySystem", "reactSystem"],
};

/**
 *
 * @param {CommandContext} obj
 */
export async function use(obj) {
  try {
    let done = [];
    const { commands } = obj;
    const userCache = await obj.money.get(obj.input.sid);
    for (const key in commands) {
      try {
        if (userCache.isBanned) {
          continue;
        }
        const command = commands[key];
        if (done.includes(command.meta.name)) {
          continue;
        }
        done.push(command.meta.name);
        if (typeof command.event !== "function") {
          continue;
        }
        const { meta } = command;
        if (
          meta.eventType &&
          Array.isArray(meta.eventType) &&
          !meta.eventType.includes(obj.event.type)
        ) {
          continue;
        }
        if (
          meta.eventType &&
          typeof meta.eventType === "string" &&
          meta.eventType !== obj.event.type
        ) {
          continue;
        }

        console.log("Executing command event:", command.meta.name);
        await command.event(obj);
      } catch (error) {
        console.log("Error processing command:", error);
        obj.output.error(error);
      }
    }
  } catch (error) {
    console.log("Error in use function:", error);
  } finally {
    console.log("Finished processing commands.");
    obj.next();
  }
}
