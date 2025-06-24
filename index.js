const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Bot Configuration
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const DEVELOPER_ID = process.env.DEVELOPER_ID;

// Bot Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Einstellungen für Auto-DM beim Server-Join
const serverSettings = new Map();

// Markdown Hilfe Embed
const createMarkdownHelp = () => {
    return new EmbedBuilder()
        .setTitle('📝 Discord Markdown Hilfe')
        .setColor('#5865F2')
        .addFields(
            { name: '**Fett**', value: '`**text**` oder `__text__`', inline: true },
            { name: '*Kursiv*', value: '`*text*` oder `_text_`', inline: true },
            { name: '~~Durchgestrichen~~', value: '`~~text~~`', inline: true },
            { name: '`Code`', value: '`\\`text\\``', inline: true },
            { name: '```Codeblock```', value: '`\\`\\`\\`text\\`\\`\\``', inline: true },
            { name: '> Zitat', value: '`> text`', inline: true },
            { name: '# Überschrift 1', value: '`# text`', inline: false },
            { name: '## Überschrift 2', value: '`## text`', inline: false },
            { name: '### Überschrift 3', value: '`### text`', inline: false },
            { name: 'Kombinationen', value: '`***fett und kursiv***`\n`__***unterstrichen, fett und kursiv***__`', inline: false },
            { name: 'Listen', value: '`- Punkt 1`\n`- Punkt 2`\n`1. Nummeriert`', inline: false },
            { name: 'Links', value: '`[Linktext](https://example.com)`', inline: false }
        )
        .setFooter({ text: 'Tipp: Nutze \\ vor Zeichen um sie zu "escapen"' });
};

// Slash Commands definieren
const commands = [
    new SlashCommandBuilder()
        .setName('active')
        .setDescription('Gibt dem Entwickler eine spezielle Rolle'),
    
    new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Stelle eine Willkommensnachricht für neue Mitglieder ein')
        .addStringOption(option =>
            option.setName('nachricht')
                .setDescription('Die Nachricht, die neue Mitglieder erhalten')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Sende eine DM an alle Mitglieder des Servers')
        .addStringOption(option =>
            option.setName('nachricht')
                .setDescription('Die Nachricht, die gesendet werden soll')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicke einen Benutzer vom Server')
        .addUserOption(option =>
            option.setName('benutzer')
                .setDescription('Der Benutzer, der gekickt werden soll')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Grund für den Kick')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banne einen Benutzer vom Server')
        .addUserOption(option =>
            option.setName('benutzer')
                .setDescription('Der Benutzer, der gebannt werden soll')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Grund für den Bann')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('tage')
                .setDescription('Anzahl der Tage, für die Nachrichten gelöscht werden sollen (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Gib einem Benutzer einen Timeout')
        .addUserOption(option =>
            option.setName('benutzer')
                .setDescription('Der Benutzer, der einen Timeout erhalten soll')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('minuten')
                .setDescription('Timeout-Dauer in Minuten (1-40320)')
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Grund für den Timeout')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Entbanne einen Benutzer')
        .addStringOption(option =>
            option.setName('benutzer_id')
                .setDescription('Die ID des Benutzers, der entbannt werden soll')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Lösche Nachrichten in diesem Kanal')
        .addIntegerOption(option =>
            option.setName('anzahl')
                .setDescription('Anzahl der zu löschenden Nachrichten (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Zeige Informationen über einen Benutzer')
        .addUserOption(option =>
            option.setName('benutzer')
                .setDescription('Der Benutzer, über den Informationen angezeigt werden sollen')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Zeige Informationen über den Server'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Zeige alle verfügbaren Befehle')
];

// Commands registrieren
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function deployCommands() {
    try {
        console.log('Registriere Slash Commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Slash Commands erfolgreich registriert!');
    } catch (error) {
        console.error('Fehler beim Registrieren der Commands:', error);
    }
}

// Bot Events
client.once('ready', () => {
    console.log(`${client.user.tag} ist online!`);
    deployCommands();
});

// Neues Mitglied beigetreten
client.on('guildMemberAdd', async (member) => {
    const guildId = member.guild.id;
    const welcomeMessage = serverSettings.get(`${guildId}_welcome`);
    
    if (welcomeMessage) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎉 Willkommen!')
                .setDescription(welcomeMessage)
                .setColor('#00ff00')
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `Server: ${member.guild.name}` });
            
            await member.send({ embeds: [embed] });
        } catch (error) {
            console.log(`Konnte keine DM an ${member.user.tag} senden:`, error);
        }
    }
});

// Markdown Hilfe bei jeder Nachricht
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Zufällige Chance, Markdown-Hilfe zu zeigen (5%)
    if (Math.random() < 0.05) {
        const helpEmbed = createMarkdownHelp();
        try {
            await message.reply({ 
                embeds: [helpEmbed], 
                ephemeral: true 
            });
        } catch (error) {
            console.log('Konnte Markdown-Hilfe nicht senden:', error);
        }
    }
});

// Slash Command Handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'active':
                if (interaction.user.id !== DEVELOPER_ID) {
                    return await interaction.reply({ 
                        content: '❌ Nur der Entwickler kann diesen Befehl verwenden!', 
                        ephemeral: true 
                    });
                }
                
                // Erstelle oder finde die Developer-Rolle
                let devRole = interaction.guild.roles.cache.find(role => role.name === 'Developer');
                if (!devRole) {
                    devRole = await interaction.guild.roles.create({
                        name: 'Developer',
                        color: '#ff0000',
                        permissions: [PermissionFlagsBits.Administrator],
                        hoist: true
                    });
                }
                
                const member = await interaction.guild.members.fetch(interaction.user.id);
                await member.roles.add(devRole);
                
                await interaction.reply({ 
                    content: '✅ Developer-Rolle wurde dir zugewiesen!', 
                    ephemeral: true 
                });
                break;

            case 'setup-welcome':
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await interaction.reply({ 
                        content: '❌ Du benötigst die "Server verwalten" Berechtigung!', 
                        ephemeral: true 
                    });
                }
                
                const welcomeMsg = interaction.options.getString('nachricht');
                serverSettings.set(`${interaction.guild.id}_welcome`, welcomeMsg);
                
                await interaction.reply({ 
                    content: `✅ Willkommensnachricht eingestellt:\n\`\`\`${welcomeMsg}\`\`\``, 
                    ephemeral: true 
                });
                break;

            case 'dm':
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    return await interaction.reply({ 
                        content: '❌ Du benötigst die "Nachrichten verwalten" Berechtigung!', 
                        ephemeral: true 
                    });
                }
                
                await interaction.deferReply({ ephemeral: true });
                
                const dmMessage = interaction.options.getString('nachricht');
                const members = await interaction.guild.members.fetch();
                let successCount = 0;
                let failCount = 0;
                
                for (const member of members.values()) {
                    if (member.user.bot) continue;
                    
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle('📢 Server-Nachricht')
                            .setDescription(dmMessage)
                            .setColor('#0099ff')
                            .setFooter({ text: `Von: ${interaction.guild.name}` });
                        
                        await member.send({ embeds: [embed] });
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                }
                
                await interaction.editReply({ 
                    content: `✅ DM gesendet!\n📤 Erfolgreich: ${successCount}\n❌ Fehlgeschlagen: ${failCount}` 
                });
                break;

            case 'kick':
                if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                    return await interaction.reply({ 
                        content: '❌ Du benötigst die "Mitglieder kicken" Berechtigung!', 
                        ephemeral: true 
                    });
                }
                
                const kickUser = interaction.options.getUser('benutzer');
                const kickReason = interaction.options.getString('grund') || 'Kein Grund angegeben';
                const kickMember = await interaction.guild.members.fetch(kickUser.id);
                
                if (!kickMember.kickable) {
                    return await interaction.reply({ 
                        content: '❌ Ich kann diesen Benutzer nicht kicken!', 
                        ephemeral: true 
                    });
                }
                
                await kickMember.kick(kickReason);
                await interaction.reply({ 
                    content: `✅ ${kickUser.tag} wurde gekickt!\nGrund: ${kickReason}` 
                });
                break;

            case 'ban':
                if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return await interaction.reply({ 
                        content: '❌ Du benötigst die "Mitglieder bannen" Berechtigung!', 
                        ephemeral: true 
                    });
                }
                
                const banUser = interaction.options.getUser('benutzer');
                const banReason = interaction.options.getString('grund') || 'Kein Grund angegeben';
                const deleteDays = interaction.options.getInteger('tage') || 0;
                
                try {
                    await interaction.guild.members.ban(banUser.id, {
                        reason: banReason,
                        deleteMessageDays: deleteDays
                    });
                    
                    await interaction.reply({ 
                        content: `✅ ${banUser.tag} wurde gebannt!\nGrund: ${banReason}\nNachrichten gelöscht: ${deleteDays} Tage` 
                    });
                } catch (error) {
                    await interaction.reply({ 
                        content: '❌ Fehler beim Bannen des Benutzers!', 
                        ephemeral: true 
                    });
                }
                break;

            case 'timeout':
                if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return await interaction.reply({ 
                        content: '❌ Du benötigst die "Mitglieder moderieren" Berechtigung!', 
                        ephemeral: true 
                    });
                }
                
                const timeoutUser = interaction.options.getUser('benutzer');
                const timeoutMinutes = interaction.options.getInteger('minuten');
                const timeoutReason = interaction.options.getString('grund') || 'Kein Grund angegeben';
                const timeoutMember = await interaction.guild.members.fetch(timeoutUser.id);
                
                const timeoutDuration = timeoutMinutes * 60 * 1000; // In Millisekunden
                
                try {
                    await timeoutMember.timeout(timeoutDuration, timeoutReason);
                    await interaction.reply({ 
                        content: `✅ ${timeoutUser.tag} hat einen ${timeoutMinutes}-minütigen Timeout erhalten!\nGrund: ${timeoutReason}` 
                    });
                } catch (error) {
                    await interaction.reply({ 
                        content: '❌ Fehler beim Timeout des Benutzers!', 
                        ephemeral: true 
                    });
                }
                break;

            case 'unban':
                if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return await interaction.reply({ 
                        content: '❌ Du benötigst die "Mitglieder bannen" Berechtigung!', 
                        ephemeral: true 
                    });
                }
                
                const unbanUserId = interaction.options.getString('benutzer_id');
                
                try {
                    await interaction.guild.members.unban(unbanUserId);
                    await interaction.reply({ 
                        content: `✅ Benutzer mit ID ${unbanUserId} wurde entbannt!` 
                    });
                } catch (error) {
                    await interaction.reply({ 
                        content: '❌ Fehler beim Entbannen! Überprüfe die Benutzer-ID.', 
                        ephemeral: true 
                    });
                }
                break;

            case 'clear':
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    return await interaction.reply({ 
                        content: '❌ Du benötigst die "Nachrichten verwalten" Berechtigung!', 
                        ephemeral: true 
                    });
                }
                
                const deleteCount = interaction.options.getInteger('anzahl');
                const messages = await interaction.channel.messages.fetch({ limit: deleteCount });
                
                try {
                    await interaction.channel.bulkDelete(messages);
                    await interaction.reply({ 
                        content: `✅ ${deleteCount} Nachrichten wurden gelöscht!`, 
                        ephemeral: true 
                    });
                } catch (error) {
                    await interaction.reply({ 
                        content: '❌ Fehler beim Löschen der Nachrichten!', 
                        ephemeral: true 
                    });
                }
                break;

            case 'userinfo':
                const targetUser = interaction.options.getUser('benutzer') || interaction.user;
                const targetMember = await interaction.guild.members.fetch(targetUser.id);
                
                const userEmbed = new EmbedBuilder()
                    .setTitle(`👤 Benutzer-Info: ${targetUser.tag}`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: 'ID', value: targetUser.id, inline: true },
                        { name: 'Account erstellt', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
                        { name: 'Server beigetreten', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`, inline: true },
                        { name: 'Rollen', value: targetMember.roles.cache.map(role => role.name).join(', ') || 'Keine', inline: false }
                    )
                    .setColor('#0099ff');
                
                await interaction.reply({ embeds: [userEmbed] });
                break;

            case 'serverinfo':
                const guild = interaction.guild;
                const owner = await guild.fetchOwner();
                
                const serverEmbed = new EmbedBuilder()
                    .setTitle(`🏰 Server-Info: ${guild.name}`)
                    .setThumbnail(guild.iconURL())
                    .addFields(
                        { name: 'ID', value: guild.id, inline: true },
                        { name: 'Owner', value: owner.user.tag, inline: true },
                        { name: 'Mitglieder', value: guild.memberCount.toString(), inline: true },
                        { name: 'Erstellt am', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                        { name: 'Kanäle', value: guild.channels.cache.size.toString(), inline: true },
                        { name: 'Rollen', value: guild.roles.cache.size.toString(), inline: true }
                    )
                    .setColor('#0099ff');
                
                await interaction.reply({ embeds: [serverEmbed] });
                break;

            case 'help':
                const helpEmbed = new EmbedBuilder()
                    .setTitle('📚 Bot-Befehle')
                    .setDescription('Hier sind alle verfügbaren Befehle:')
                    .addFields(
                        { name: '👨‍💻 Developer', value: '`/active` - Developer-Rolle erhalten', inline: false },
                        { name: '📨 Nachrichten', value: '`/setup-welcome` - Willkommensnachricht einrichten\n`/dm` - DM an alle Mitglieder', inline: false },
                        { name: '🔨 Moderation', value: '`/kick` - Benutzer kicken\n`/ban` - Benutzer bannen\n`/timeout` - Benutzer timeout\n`/unban` - Benutzer entbannen\n`/clear` - Nachrichten löschen', inline: false },
                        { name: 'ℹ️ Information', value: '`/userinfo` - Benutzer-Informationen\n`/serverinfo` - Server-Informationen\n`/help` - Diese Hilfe', inline: false }
                    )
                    .setColor('#0099ff')
                    .setFooter({ text: 'Markdown-Hilfe wird automatisch angezeigt!' });
                
                // Markdown-Hilfe hinzufügen
                const markdownHelp = createMarkdownHelp();
                
                await interaction.reply({ 
                    embeds: [helpEmbed, markdownHelp], 
                    ephemeral: true 
                });
                break;
        }
    } catch (error) {
        console.error('Fehler beim Ausführen des Commands:', error);
        
        const errorReply = { 
            content: '❌ Ein Fehler ist aufgetreten beim Ausführen des Befehls!', 
            ephemeral: true 
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorReply);
        } else {
            await interaction.reply(errorReply);
        }
    }
});



// Für Render.com Web Service
const PORT = process.env.PORT || 3000;

// Einfacher HTTP Server für Keep-Alive
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(require('fs').readFileSync('index.html'));
});

server.listen(PORT, () => {
    console.log(`HTTP Server läuft auf Port ${PORT}`);
});



// Error Handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Bot starten
client.login(TOKEN);
