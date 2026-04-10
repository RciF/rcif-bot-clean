const { SlashCommandBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("bot test command"),

  async execute(interaction) {
    if (interaction.user.id !== "529320108032786433") {
      return interaction.reply({ content: "❌", ephemeral: true })
    }

    await database.query(`
      DELETE FROM inventory 
      WHERE user_id = '529320108032786433'
      AND item_id NOT IN (
        'daihatsu', 'corolla', 'accent', 'rio',
        'camry', 'accord', 'mazda6',
        'mercedes_c', 'bmw_5', 'audi_a6', 'lexus_es',
        'lamborghini', 'ferrari', 'bugatti', 'rolls_royce',
        'small_house', 'medium_house', 'villa', 'palace',
        'street', 'neighborhood', 'village', 'city',
        'province', 'region', 'country', 'continent'
      )
    `)

    await interaction.reply({ content: "✅ تم مسح العناصر القديمة", ephemeral: true })
  },
}