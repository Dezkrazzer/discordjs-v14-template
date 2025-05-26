const config = require("../../config.json");
const child = require("child_process");
const axios = require("axios");

module.exports = {
  name: "exec",
  aliases: ["ex", "$"],
  description: "exec / run terminal in discord!",
  category: "Owner",
  run: async (client, message, args) => {
    if (message.author.id !== config.ownerID)
      return message.channel.send({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              "<a:no:954773357407113298> | I'm sorry but you don't have permission to do that."
            )
            .setColor(Discord.Colors.Red),
        ],
      });

    const command = args.join(" ");
    if (!command)
      return message.channel.send("please give a command to run in terminal!");

    child.exec(command, async (err, res) => {
      if (err)
        return message.channel.send({
          content: `**ERROR:** \n\`\`\`js\n${err}\n\`\`\``,
        });

      try {
        if (res.length > 2000) {
          const { data } = await axios.post(
            "https://bin.acronet.work/documents",
            res
          );
          await message.channel
            .send({
              content: "Eval...!",
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      label: "Result",
                      url: `https://bin.acronet.work/${data.key}.js`,
                      style: 5,
                    },
                  ],
                },
              ],
            })
            .then((msg) => {
              setTimeout(() => msg.delete(), 20000);
            });
        } else {
          message.channel
            .send(`\`\`\`js\n${res.slice(0, 2000)}\n\`\`\``, { code: "js" })
            .then((msg) => {
              setTimeout(() => msg.delete(), 20000);
            });
        }
      } catch (e) {
        message.channel.send({ content: `-` });
      }
    });
  },
};
