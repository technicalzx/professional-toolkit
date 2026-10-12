import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('users',{
 id:text('id').primaryKey(),username:text('username').notNull().unique(),name:text('name').notNull(),
 password:text('password').notNull(),version:integer('version').notNull().default(1),created:integer('created').notNull()
});
export const sessions=sqliteTable('sessions',{
 hash:text('hash').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 version:integer('version').notNull(),created:integer('created').notNull(),expires:integer('expires').notNull()
},t=>[index('sessions_user').on(t.userId),index('sessions_expiry').on(t.expires)]);
export const recoveryCodes=sqliteTable('recovery_codes',{
 hash:text('hash').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'})
},t=>[index('recovery_user').on(t.userId)]);
export const authLimits=sqliteTable('auth_limits',{
 key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()
},t=>[index('limits_expiry').on(t.expires)]);
export const reports=sqliteTable('reports',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 content:text('content').notNull(),created:integer('created').notNull()
},t=>[index('reports_user').on(t.userId)]);
