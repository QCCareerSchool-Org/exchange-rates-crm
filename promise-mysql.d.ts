/**
 * promise-mysql.d.ts
 * 
 * works with promise-mysql 3.1.1 and mysql 2.15.0
 * 
 * @author Dave Welsh <dave@qccareerschool.com>
 * 
 */

declare module 'promise-mysql' {
    
        import { Pool as _Pool, Connection as _Connection, ConnectionConfig, PoolConfig, MysqlError } from 'mysql';
        export { ConnectionConfig, PoolConfig, FieldInfo } from 'mysql';
    
        /**
         * create a connection
         * @param connectionUri the connection string
         */
        export function createConnection(connectionUri: string): Promise<Connection>;
    
        /**
         * create a connection
         * @param config the connection configuration
         */
        export function createConnection(config: ConnectionConfig): Promise<Connection>;
    
        /**
         * create a connection pool with the specified parameters
         * @param config the pool configuration
         */
        export function createPool(config: PoolConfig): Pool;
    
        export function escape(value: any): string;
        export function escapeId(value: string): string;
        export function escapeId(values: string[]): string;
        export function format(sql: string): string;
        export function format(sql: string, values: any[]): string;
        export function format(sql: string, values: any): string;
    
        export class Connection {
    
            connection: _Connection;
            config: ConnectionConfig;
    
            query(sql: string): Promise<any>
            query(sql: string, values: any[]): Promise<any>
            query(sql: string, values: any): Promise<any>
    
            beginTransaction(): Promise<void>
    
            commit(): Promise<void>
    
            rollback(): Promise<void>
    
            changeUser(data: any): Promise<void>
    
            ping(data: any): Promise<void>
    
            statistics(data: any): Promise<void>
    
            end(): Promise<void>
    
            destroy(): Promise<void>
    
            pause(): Promise<void>
    
            resume(): Promise<void>
    
            escape(value: any): string;
    
            escapeId(value: string): string;
            escapeId(values: string[]): string;
    
            format(sql: string): string;
            format(sql: string, values: any[]): string;
            format(sql: string, values: any): string;
    
        }
    
        export class Pool {
    
            pool: _Pool;
    
            /** get a connection from the connection pool */
            getConnection(): Promise<PoolConnection>;
    
            /**
             * release a connection back to the connection pool
             * @param connection the connection to release
             */
            releaseConnection(connection: PoolConnection): void;
    
            query(sql: string): Promise<any>
            query(sql: string, values: any[]): Promise<any>
            query(sql: string, values: any): Promise<any>
    
            end(data: any): Promise<void>
    
            release(data: any): Promise<void>
    
            escape(value: any): string;
    
            escapeId(value: string): string;
            escapeId(values: string[]): string;
    
            on(ev: 'connection' | 'acquire' | 'release', callback: (connection: PoolConnection) => void): Pool;
            on(ev: 'error', callback: (err: MysqlError) => void): Pool;
            on(ev: 'enqueue', callback: (err?: MysqlError) => void): Pool;
            on(ev: string, callback: (...args: any[]) => void): Pool;
        }
    
        export class PoolConnection extends Connection {
    
            release(): Promise<any>;
    
        }
    
    }
    