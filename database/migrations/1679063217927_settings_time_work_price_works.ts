import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up() {
    this.schema
      .raw(`INSERT INTO "public"."settings" ("code", "value", "label", "description", "type", "inactive_at", "created_at", "updated_at") VALUES ('CLOSE_TIME', '17:00', 'Jam Pulang', 'Jam Pulang Kerja', 'TIME', NULL, NULL, NULL);
    INSERT INTO "public"."settings" ("code", "value", "label", "description", "type", "inactive_at", "created_at", "updated_at") VALUES ('LATETIME_PRICE_PER_MINUTE', '25000', 'Denda Keterlambatan', 'Biaya Denda per menit', 'NUMBER', NULL, NULL, NULL);
    INSERT INTO "public"."settings" ("code", "value", "label", "description", "type", "inactive_at", "created_at", "updated_at") VALUES ('START_TIME', '07:00', 'Jam Kerja', 'Jam Mulai Kerja', 'TIME', NULL, NULL, NULL);
    INSERT INTO "public"."settings" ("code", "value", "label", "description", "type", "inactive_at", "created_at", "updated_at") VALUES ('OVERTIME_PRICE_PER_MINUTE', '250', 'Upah Lembur', 'Upah Lembur dalam menit', 'NUMBER', NULL, NULL, NULL);`)
  }
}
