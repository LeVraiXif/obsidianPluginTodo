import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface DailyTodoPluginSettings {
  templateFilePath: string;
  enableNotifications: boolean;
  notificationInterval: number; // en minutes
}

const DEFAULT_SETTINGS: DailyTodoPluginSettings = {
  templateFilePath: "",
  enableNotifications: true,
  notificationInterval: 60, // par défaut 60 minutes
};

export default class DailyTodoPlugin extends Plugin {
  settings: DailyTodoPluginSettings;
  notificationTimer: number;

  async onload() {
    await this.loadSettings();
    this.app.workspace.on('layout-change', () => this.createDailyTodoNote());
    this.addSettingTab(new DailyTodoSettingTab(this.app, this));

    this.startNotificationTimer();
  }

  async onunload() {
    this.stopNotificationTimer();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async readTemplateFile(): Promise<string> {
    const { vault } = this.app;
    const templateFile = vault.getAbstractFileByPath(this.settings.templateFilePath);

    console.log("Template file path:", this.settings.templateFilePath);
    console.log("Template file:", templateFile);

    if (templateFile instanceof TFile) {
      try {
        const content = await vault.read(templateFile);
        console.log("Template file content:", content);
        return content;
      } catch (error) {
        console.error("Error reading template file:", error);
      }
    }
    return `No template`;
  }

  async createDailyTodoNote() {
    const dateFormat = 'YYYY-MM-DD';
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

  async checkAndNotify() {
    if (!this.settings.enableNotifications) {
      return;
    }

    const dateFormat = 'YYYY-MM-DD';
    const folderName = 'Daily Todos';
    const vault = this.app.vault;

    const today = window.moment().format(dateFormat);
    const dailyNoteName = `Todo - ${today}`;

    const dailyNote = vault.getAbstractFileByPath(`${folderName}/${dailyNoteName}.md`);

    if (!dailyNote) {
      new Notification("Daily Todo", {
        body: "N'oubliez pas de créer votre liste de tâches quotidiennes !",
      });
    }
  }

  startNotificationTimer() {
    const interval = this.settings.notificationInterval * 60 * 1000;
    this.notificationTimer = window.setInterval(() => this.checkAndNotify(), interval);
  }

  stopNotificationTimer() {
    if (this.notificationTimer) {
      window.clearInterval(this.notificationTimer);
      this.notificationTimer = null;
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
        .setDesc('Enable or disable daily todo notifications')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.enableNotifications)
          .onChange(async (value) => {
            this.plugin.settings.enableNotifications = value;
            await this.plugin.saveSettings();
          }));
  
    const notificationIntervalSetting = new Setting(containerEl)
        .setName('Notification interval')
        .setDesc('Interval between notifications in minutes');
  
    // Créer un élément span pour afficher la valeur du curseur
    const intervalDisplay = notificationIntervalSetting.descEl.createEl('span', {
      text: ` (${this.plugin.settings.notificationInterval} minutes)`,
    });
  
    notificationIntervalSetting.addSlider(slider => slider
      .setLimits(1, 240, 1)
      .setValue(this.plugin.settings.notificationInterval)
      .onChange(async (value) => {
        // Mettre à jour l'affichage de la valeur du curseur
        intervalDisplay.textContent = ` (${value} minutes)`;
  
        this.plugin.settings.notificationInterval = value;
        await this.plugin.saveSettings();
        this.plugin.stopNotificationTimer();
        this.plugin.startNotificationTimer();
      }));
  }
}