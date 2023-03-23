import { App, Plugin, PluginSettingTab, Setting, TFile, MarkdownView } from 'obsidian';

interface DailyTodoPluginSettings {
  templateFilePath: string;
  notificationEnabled: boolean;
  notificationType: 'interval' | 'fixed';
  notificationInterval: number;
  reminders: string[];
  remindersSent: boolean[];
  lastResetDate: string;
}

const DEFAULT_SETTINGS: DailyTodoPluginSettings = {
  templateFilePath: "",
  notificationEnabled: true,
  notificationType: 'interval',
  notificationInterval: 60,
  reminders: [],
  remindersSent: [],
  lastResetDate: '',
};

export default class DailyTodoPlugin extends Plugin {
  settings: DailyTodoPluginSettings;

  async onload() {
    await this.loadSettings();
    this.app.workspace.on('layout-change', () => this.createDailyTodoNote());
    this.addSettingTab(new DailyTodoSettingTab(this.app, this));

    if (this.settings.notificationEnabled) {
      if (this.settings.notificationType === 'interval') {
        setInterval(() => this.checkAndNotify(), this.settings.notificationInterval * 60 * 1000);
      } else {
        this.initReminders();
      }
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async readTemplateFile(): Promise<string> {
    const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateFilePath);

    if (templateFile instanceof TFile) {
      try {
        return await this.app.vault.read(templateFile);
      } catch (error) {
        console.error("Error reading template file:", error);
      }
    }
    return `No template`;
  }

  initReminders() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (this.settings.lastResetDate !== today) {
      this.resetReminders();
      this.settings.lastResetDate = today;
      this.saveSettings();
    }

    this.settings.reminders.forEach((time, index) => {
      const [hours, minutes] = time.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      if (now < reminderTime && !this.settings.remindersSent[index]) {
        setTimeout(() => {
          this.checkAndNotify();
          this.settings.remindersSent[index] = true;
          this.saveSettings();
        }, reminderTime.getTime() - now.getTime());
      }
    });
  }

  async createDailyTodoNote() {
    const dateFormat = 'DD-MM-YYYY';
    const folderName = 'Daily Todos';
    const vault = this.app.vault;

    const today = window.moment().format(dateFormat);
    const dailyNoteName = `Todo - ${today}`;

    const folder = vault.getAbstractFileByPath(folderName);

    if (!folder) {
      await vault.createFolder(folderName);
    }

    const dailyNote = vault.getAbstractFileByPath(`${folderName}/${dailyNoteName}.md`);

    if (!dailyNote) {
      const dailyTodoContent = await this.readTemplateFile();
      await vault.create(`${folderName}/${dailyNoteName}.md`, dailyTodoContent);
    }
  }
  resetReminders() {
    this.settings.remindersSent = this.settings.reminders.map(() => false);
  }


  async getDailyNote(): Promise<TFile | null> {
    const dateFormat = 'DD-MM-YYYY';
    const folderName = 'Daily Todos';
    const vault = this.app.vault;

    const today = window.moment().format(dateFormat);
    const dailyNoteName = `Todo - ${today}`;

    const dailyNote = vault.getAbstractFileByPath(`${folderName}/${dailyNoteName}.md`);

    if (dailyNote instanceof TFile) {
      return dailyNote;
    }

    return null;
  }

  async checkAndNotify() {
    const dailyNote = await this.getDailyNote();
    if (dailyNote) {
      const content = await this.app.vault.read(dailyNote);
      const checkboxes = content.match(/\[([ xX])\]/g) || [];
      const completed = checkboxes.every((checkbox) => checkbox === '[x]' || checkbox === '[X]');

      if (!completed) {
        new Notification("N'oubliez pas de terminer votre liste de tâches quotidiennes !");
      }
    }
  }
}

class DailyTodoSettingTab extends PluginSettingTab {
  plugin: DailyTodoPlugin;

  constructor(app: App, plugin: DailyTodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Daily Todo Plugin Settings' });

    new Setting(containerEl)
      .setName('Template file path')
      .setDesc('Path to the template file in your vault')
      .addText(text => text
        .setPlaceholder('Example: Templates/DailyTodo.md')
        .setValue(this.plugin.settings.templateFilePath)
        .onChange(async (value) => {
          this.plugin.settings.templateFilePath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable notifications')
      .setDesc('Enable or disable notifications')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.notificationEnabled)
        .onChange(async (value) => {
          this.plugin.settings.notificationEnabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Type de notification')
      .setDesc("Choisissez 'Interval' pour des notifications régulières ou 'Fixed' pour des rappels à des heures précises")
      .addDropdown(dropdown => dropdown
        .addOption('interval', 'Interval')
        .addOption('fixed', 'Fixed')
        .setValue(this.plugin.settings.notificationType)
        .onChange(async (value: 'interval' | 'fixed') => {
          this.plugin.settings.notificationType = value;
          await this.plugin.saveSettings();
          this.plugin.initReminders();
        }));

    new Setting(containerEl)
      .setName('Notification interval')
      .setDesc('Interval de notification en minutes')
      .addSlider(slider => slider
        .setLimits(1, 240, 1)
        .setDynamicTooltip()
        .setValue(this.plugin.settings.notificationInterval)
        .onChange(async (value) => {
          this.plugin.settings.notificationInterval = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Reminders')
      .setDesc('Add reminder times in HH:mm format')
      .addButton(button => button
        .setButtonText('Add a reminder')

        .onClick(async () => {
          this.plugin.settings.reminders.push('12:00');
          this.plugin.settings.remindersSent.push(false);
          await this.plugin.saveSettings();
          this.display();
        }));

    this.plugin.settings.reminders.forEach((time, index) => {
      new Setting(containerEl)
        .setName(`Reminder #${index + 1}`)
        .addText(text => text
          .setValue(time)
          .onChange(async (value) => {
            this.plugin.settings.reminders[index] = value;
            await this.plugin.saveSettings();
            this.plugin.initReminders();
          }))
        .addButton(button => button
          .setButtonText('Remove')
          .onClick(async () => {
            this.plugin.settings.reminders.splice(index, 1);
            this.plugin.settings.remindersSent.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          }));
    });
  }
}

