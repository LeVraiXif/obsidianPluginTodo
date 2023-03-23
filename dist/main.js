var __create = Object.create;
var __defProp = Object.defineProperty;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __markAsModule = (target) => __defProp(target, "__esModule", {value: true});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {get: all[name], enumerable: true});
};
var __exportStar = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, {get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable});
  }
  return target;
};
var __toModule = (module2) => {
  return __exportStar(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? {get: () => module2.default, enumerable: true} : {value: module2, enumerable: true})), module2);
};

// src/main.ts
__markAsModule(exports);
__export(exports, {
  default: () => main_default
});
var import_obsidian = __toModule(require("obsidian"));
var DEFAULT_SETTINGS = {
  templateFilePath: "",
  notificationEnabled: true,
  notificationType: "interval",
  notificationInterval: 60,
  reminders: [],
  remindersSent: [],
  lastResetDate: ""
};
var DailyTodoPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.app.workspace.on("layout-change", () => this.createDailyTodoNote());
    this.addSettingTab(new DailyTodoSettingTab(this.app, this));
    if (this.settings.notificationEnabled) {
      if (this.settings.notificationType === "interval") {
        setInterval(() => this.checkAndNotify(), this.settings.notificationInterval * 60 * 1e3);
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
  async readTemplateFile() {
    const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateFilePath);
    if (templateFile instanceof import_obsidian.TFile) {
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
      const [hours, minutes] = time.split(":").map(Number);
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
    const dateFormat = "YYYY-MM-DD";
    const folderName = "Daily Todos";
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
  async getDailyNote() {
    const dateFormat = "YYYY-MM-DD";
    const folderName = "Daily Todos";
    const vault = this.app.vault;
    const today = window.moment().format(dateFormat);
    const dailyNoteName = `Todo - ${today}`;
    const dailyNote = vault.getAbstractFileByPath(`${folderName}/${dailyNoteName}.md`);
    if (dailyNote instanceof import_obsidian.TFile) {
      return dailyNote;
    }
    return null;
  }
  async checkAndNotify() {
    const dailyNote = await this.getDailyNote();
    if (dailyNote) {
      const content = await this.app.vault.read(dailyNote);
      const checkboxes = content.match(/\[([ xX])\]/g) || [];
      const completed = checkboxes.every((checkbox) => checkbox === "[x]" || checkbox === "[X]");
      if (!completed) {
        new Notification("N'oubliez pas de terminer votre liste de t\xE2ches quotidiennes !");
      }
    }
  }
};
var main_default = DailyTodoPlugin;
var DailyTodoSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    let {containerEl} = this;
    containerEl.empty();
    containerEl.createEl("h2", {text: "Daily Todo Plugin Settings"});
    new import_obsidian.Setting(containerEl).setName("Template file path").setDesc("Path to the template file in your vault").addText((text) => text.setPlaceholder("Example: Templates/DailyTodo.md").setValue(this.plugin.settings.templateFilePath).onChange(async (value) => {
      this.plugin.settings.templateFilePath = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Enable notifications").setDesc("Enable or disable notifications").addToggle((toggle) => toggle.setValue(this.plugin.settings.notificationEnabled).onChange(async (value) => {
      this.plugin.settings.notificationEnabled = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Type de notification").setDesc("Choisissez 'Interval' pour des notifications r\xE9guli\xE8res ou 'Fixed' pour des rappels \xE0 des heures pr\xE9cises").addDropdown((dropdown) => dropdown.addOption("interval", "Interval").addOption("fixed", "Fixed").setValue(this.plugin.settings.notificationType).onChange(async (value) => {
      this.plugin.settings.notificationType = value;
      await this.plugin.saveSettings();
      this.plugin.initReminders();
    }));
    new import_obsidian.Setting(containerEl).setName("Notification interval").setDesc("Interval de notification en minutes").addSlider((slider) => slider.setLimits(1, 240, 1).setDynamicTooltip().setValue(this.plugin.settings.notificationInterval).onChange(async (value) => {
      this.plugin.settings.notificationInterval = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Reminders").setDesc("Add reminder times in HH:mm format").addButton((button) => button.setButtonText("Add a reminder").onClick(async () => {
      this.plugin.settings.reminders.push("12:00");
      this.plugin.settings.remindersSent.push(false);
      await this.plugin.saveSettings();
      this.display();
    }));
    this.plugin.settings.reminders.forEach((time, index) => {
      new import_obsidian.Setting(containerEl).setName(`Reminder #${index + 1}`).addText((text) => text.setValue(time).onChange(async (value) => {
        this.plugin.settings.reminders[index] = value;
        await this.plugin.saveSettings();
        this.plugin.initReminders();
      })).addButton((button) => button.setButtonText("Remove").onClick(async () => {
        this.plugin.settings.reminders.splice(index, 1);
        this.plugin.settings.remindersSent.splice(index, 1);
        await this.plugin.saveSettings();
        this.display();
      }));
    });
  }
};
