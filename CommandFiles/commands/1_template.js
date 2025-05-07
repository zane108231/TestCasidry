// @ts-check

// This is a command template!
// Make a new file, copy+paste, and modify!

export default easyCMD({
  name: "hello",
  description: "Greets a user.",
  title: "💗 Greetings",
  async run({ print, reaction, edit, atReply }) {
    print("Hello user!");
    reaction("💗");

    edit("5 seconds later!", 5000);

    atReply(({ print }) => {
      print("Thanks for replying!");
    });
  },
});
