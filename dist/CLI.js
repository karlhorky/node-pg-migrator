"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const Migrator_1 = require("./Migrator");
const Connector_1 = require("./Connector");
class CLI {
    constructor(logger = console.log) {
        this.logger = logger;
    }
    envHelp() {
        this.logger('');
        this.logger('Environment variables:');
        this.logger('  PGHOST             Host of postgres server');
        this.logger('  PGPORT             Port of postgres server ');
        this.logger('  PGUSER             Username of postgres user');
        this.logger('  PGPASSWORD         Password of postgres user');
        this.logger('  PGDATABASE         Database Name');
    }
    help() {
        this.logger('Usage: pg-migrator <command> [paramenters]');
        this.logger('To see help text, you can run:');
        this.logger('');
        this.logger('  pg-migrator help');
        this.logger('  pg-migrator <command> help');
        this.logger('');
        this.logger('Commands:');
        this.logger('  migrate            Applies all pending migrations from the given folder');
        this.logger('  up                 Applies the migration');
        this.logger('  down               Does a rollback of the migration');
        this.logger('  create             Creates a empty migration with the given name');
        this.logger('  createDatabase     Creates the database if not already existing');
        this.logger('  dropDatabase       Drops the database if already existing');
        this.logger('  help               Shows this overview');
    }
    migrateHelp() {
        this.logger('Applies all pending migrations from the given folder');
        this.logger('');
        this.logger('Usage: pg-migrator migrate [paramenters]');
        this.logger('');
        this.logger('Options:');
        this.logger('  -f, --folder       Folder which contains the migrations');
        this.logger('                     (default: migrations)');
        this.envHelp();
    }
    upHelp() {
        this.logger('Applies the migration');
        this.logger('');
        this.logger('Usage: pg-migrator up [paramenters]');
        this.logger('');
        this.logger('Options:');
        this.logger('  -f, --folder       Folder which contains the migrations');
        this.logger('                     (default: migrations)');
        this.logger('  -k, --key          Key of the migration');
        this.logger('  -v, --version      Version of the migration (first part of key)');
        this.envHelp();
    }
    downHelp() {
        this.logger('Does a rollback of the migration');
        this.logger('');
        this.logger('Usage: pg-migrator down [paramenters]');
        this.logger('');
        this.logger('Options:');
        this.logger('  -f, --folder       Folder which contains the migrations');
        this.logger('                     (default: migrations)');
        this.logger('  -k, --key          Key of the migration');
        this.logger('  -v, --version      Version of the migration (first part of key)');
        this.envHelp();
    }
    createDatabaseHelp() {
        this.logger('Creates the database if not already existing');
        this.logger('');
        this.logger('Usage: pg-migrator create_database [paramenters]');
        this.envHelp();
    }
    dropDatabaseHelp() {
        this.logger('Drops the database if already existing');
        this.logger('');
        this.logger('Usage: pg-migrator drop_database [paramenters]');
        this.envHelp();
    }
    createHelp() {
        this.logger('Creates a empty migration with the given name');
        this.logger('');
        this.logger('Usage: pg-migrator create <name> [paramenters]');
        this.logger('  -f, --folder       Folder which contains the migrations');
        this.logger('                     (default: migrations)');
        this.envHelp();
    }
    createFolder(path) {
        const parent = path_1.resolve(path, '..');
        if (!fs_1.existsSync(parent))
            this.createFolder(parent);
        if (!fs_1.existsSync(path))
            fs_1.mkdirSync(path);
    }
    get migrationsPath() {
        const folderParam = this.getParam('f', 'folder');
        const path = folderParam ? path_1.resolve(folderParam) : path_1.resolve('migrations');
        this.createFolder(path);
        return path;
    }
    get migrationKeys() {
        const path = this.migrationsPath;
        const files = fs_1.readdirSync(path);
        this.logger(this.migrationsPath);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        return jsFiles.map(file => path_1.basename(file, '.js'));
    }
    readMigration(key) {
        const path = this.migrationsPath;
        return Object.assign({ key }, require(`${path}/${key}`));
    }
    get migrations() {
        return this.migrationKeys.map(key => this.readMigration(key));
    }
    get migration() {
        const path = this.migrationsPath;
        const keys = this.migrationKeys;
        const keyParam = this.getParam('k', 'key');
        const versionParam = this.getParam('v', 'version');
        if (keyParam && keyParam.length > 0) {
            if (keys.indexOf(keyParam) < 0) {
                throw `Unable to find key «${keyParam}» in folder «${path}»`;
            }
            return this.readMigration(keyParam);
        }
        if (versionParam && versionParam.length > 0) {
            for (const key of keys) {
                if (key.startsWith(`${versionParam}_`) || key.startsWith(`${versionParam}-`)) {
                    return this.readMigration(key);
                }
            }
            throw `Unable to find version «${versionParam}» in folder «${path}»`;
        }
        throw `Unable to find migration - please provide either version or key`;
    }
    getMigrator(tableName) {
        return new Migrator_1.Migrator(new Connector_1.Connector(tableName));
    }
    getParam(shortKey, longKey) {
        const shortParam = `-${shortKey}`;
        const longParam = `--${longKey}=`;
        const argv = process.argv;
        let result = undefined;
        for (let index = 0; index < argv.length; index += 1) {
            const param = argv[index];
            if (param === shortParam) {
                const nextParam = argv[index + 1];
                if (nextParam) {
                    if (!nextParam.startsWith('-')) {
                        result = nextParam;
                    }
                    else {
                        throw `Invalid parameter value for «${shortParam}»: «${nextParam}»`;
                    }
                }
                else {
                    throw `Value missing for parameter «${shortParam}»`;
                }
            }
            if (param.startsWith(longParam)) {
                result = param.substr(longParam.length);
            }
        }
        return result;
    }
    up() {
        return __awaiter(this, void 0, void 0, function* () {
            const migrator = this.getMigrator();
            try {
                yield migrator.up(this.migration);
            }
            finally {
                yield migrator.connector.disconnect();
            }
        });
    }
    down() {
        return __awaiter(this, void 0, void 0, function* () {
            const migrator = this.getMigrator();
            try {
                yield migrator.down(this.migration);
            }
            finally {
                yield migrator.connector.disconnect();
            }
        });
    }
    migrate() {
        return __awaiter(this, void 0, void 0, function* () {
            const migrator = this.getMigrator();
            try {
                yield migrator.migrate(this.migrations);
            }
            finally {
                yield migrator.connector.disconnect();
            }
        });
    }
    createDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            const migrator = this.getMigrator();
            try {
                yield migrator.connector.createDatabase();
            }
            finally {
                yield migrator.connector.disconnect();
            }
        });
    }
    dropDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            const migrator = this.getMigrator();
            try {
                yield migrator.connector.dropDatabase();
            }
            finally {
                yield migrator.connector.disconnect();
            }
        });
    }
    get newVersion() {
        return new Date().toISOString().substr(0, 19).replace(/[-T:]/g, '');
    }
    get nodeVersion() {
        if (this.cachedNodeVersion)
            return this.cachedNodeVersion;
        const version = Number(((process.version).match(/^v(\d+\.\d+)/) || ['', '0'])[1]);
        return this.cachedNodeVersion = version;
    }
    get template() {
        return `const pg = require('pg');

/**
 * Description of the Migration
 */
module.exports = {
  parent: undefined,
  /**
   * Method to apply migration
   * @param {pg.Pool} client
   * @returns {Promise<void>}
   */
  ${this.nodeVersion > 7 ? 'async ' : ''}up(client) {

    // ${this.nodeVersion > 7 ? 'Code for Migration' : 'Return Promise for Migration'}

  },
  /**
   * Method to rollback migration
   * @param {pg.Pool} client
   * @returns {Promise<void>}
   */
  ${this.nodeVersion > 7 ? 'async ' : ''}down(client) {

    // ${this.nodeVersion > 7 ? 'Code for Rollback' : 'Return Promise for Rollback'}

  },
}
`;
    }
    create() {
        const name = process.argv[3];
        if (!name || name.length === 0 || name.startsWith('-')) {
            throw `Value missing for parameter «name»`;
        }
        const path = this.migrationsPath;
        fs_1.writeFileSync(path_1.resolve(path, `${this.newVersion}_${name}.js`), this.template);
    }
}
exports.CLI = CLI;
exports.default = CLI;
//# sourceMappingURL=CLI.js.map