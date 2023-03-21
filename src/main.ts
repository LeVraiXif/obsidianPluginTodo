import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface DailyTodoPluginSettings {
  templateFilePath: string;
}

const DEFAULT_SETTINGS: DailyTodoPluginSettings = {
  templateFilePath: "",
};

export default class DailyTodoPlugin extends Plugin {
  settings: DailyTodoPluginSettings;

  async onload() {
    await this.loadSettings();
    this.app.workspace.on('layout-change', () => this.createDailyTodoNote());
    this.addSettingTab(new DailyTodoSettingTab(this.app, this));
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
    return `- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3`;
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
  }
}
