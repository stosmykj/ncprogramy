use image::GenericImageView;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
        version: 1,
        description: "Initial migration",
        sql: "CREATE TABLE IF NOT EXISTS programs (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                programId TEXT NOT NULL,
                name TEXT,
                orderNumber TEXT,
                deadlineAt DATETIME,
                arrivedAt DATETIME,
                doneAt DATETIME,
                count INTEGER DEFAULT 0,
                design TEXT,
                drawing TEXT,
                clamping TEXT,
                preparing INTEGER,
                programing INTEGER,
                machineWorking INTEGER,
                extraTime TEXT,
                note TEXT
            );
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                key TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS table_columns (
                key TEXT PRIMARY KEY,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                type TEXT NOT NULL DEFAULT 'string',
                position INTEGER NOT NULL DEFAULT 0,
                sort INTEGER NOT NULL DEFAULT 0,
                sortPosition INTEGER NOT NULL DEFAULT 0,
                visible BIT NOT NULL DEFAULT 1,
                width TEXT NOT NULL DEFAULT 'auto',
                align TEXT NOT NULL DEFAULT 'left',
                filter TEXT,
                computeFunctionName TEXT
            );
            
            INSERT INTO table_columns (key, type, position, visible, width, align)
            SELECT 'actions', '', 0, 1, '200', 'center'
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='actions');
            INSERT INTO table_columns (key, type, position, visible)
            SELECT 'id', 'number', 1, 0
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='id');
            INSERT INTO table_columns (key, type, position, visible)
            SELECT 'createdAt', 'datetime', 2, 0
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='createdAt');
            INSERT INTO table_columns (key, type, position, visible)
            SELECT 'updatedAt', 'datetime', 3, 0
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='updatedAt');
            INSERT INTO table_columns (key, type, position)
            SELECT 'programId', 'string', 4
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='programId');
            INSERT INTO table_columns (key, type, position)
            SELECT 'name', 'string', 5
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='name');
            INSERT INTO table_columns (key, type, position)
            SELECT 'orderNumber', 'string', 6
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='orderNumber');
            INSERT INTO table_columns (key, type, position)
            SELECT 'deadlineAt', 'date', 7
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='deadlineAt');
            INSERT INTO table_columns (key, type, position)
            SELECT 'arrivedAt', 'date', 8
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='arrivedAt');
            INSERT INTO table_columns (key, type, position)
            SELECT 'doneAt', 'date', 9
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='doneAt');
            INSERT INTO table_columns (key, type, position)
            SELECT 'count', 'number', 10
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='count');
            INSERT INTO table_columns (key, type, position)
            SELECT 'design', 'file', 11
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='design');
            INSERT INTO table_columns (key, type, position)
            SELECT 'drawing', 'file', 12
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='drawing');
            INSERT INTO table_columns (key, type, position)
            SELECT 'clamping', 'file', 13
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='clamping');
            INSERT INTO table_columns (key, type, position)
            SELECT 'preparing', 'number', 14
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='preparing');
            INSERT INTO table_columns (key, type, position)
            SELECT 'programing', 'number', 15
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='programing');
            INSERT INTO table_columns (key, type, position)
            SELECT 'machineWorking', 'number', 16
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='machineWorking');
            INSERT INTO table_columns (key, type, position)
            SELECT 'extraTime', 'string', 17
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='extraTime');
            INSERT INTO table_columns (key, type, position)
            SELECT 'note', 'string', 18
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='note');
            INSERT INTO table_columns (key, type, position, computeFunctionName)
            SELECT 'totalTime', 'number', 19, 'getTotalTime'
            WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='totalTime');",
        kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "Add indexes for performance optimization",
            sql: "
                -- Index for programId (frequently used for searching and filtering by year)
                CREATE INDEX IF NOT EXISTS idx_programs_programId ON programs(programId);

                -- Index for deadlineAt (frequently sorted and filtered)
                CREATE INDEX IF NOT EXISTS idx_programs_deadlineAt ON programs(deadlineAt);

                -- Index for arrivedAt (frequently sorted)
                CREATE INDEX IF NOT EXISTS idx_programs_arrivedAt ON programs(arrivedAt);

                -- Index for doneAt (frequently sorted and filtered for completed items)
                CREATE INDEX IF NOT EXISTS idx_programs_doneAt ON programs(doneAt);

                -- Index for createdAt (sorted by creation date)
                CREATE INDEX IF NOT EXISTS idx_programs_createdAt ON programs(createdAt);

                -- Index for updatedAt (useful for finding recently modified items)
                CREATE INDEX IF NOT EXISTS idx_programs_updatedAt ON programs(updatedAt);

                -- Composite index for common query pattern: programId + date range
                CREATE INDEX IF NOT EXISTS idx_programs_programId_deadlineAt ON programs(programId, deadlineAt);

                -- Index for table_columns sort and sortPosition (used in every data load)
                CREATE INDEX IF NOT EXISTS idx_table_columns_sort ON table_columns(sort, sortPosition);

                -- Index for table_columns position (used for ordering)
                CREATE INDEX IF NOT EXISTS idx_table_columns_position ON table_columns(position);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "Add formatting_rules table with nested condition tree support",
            sql: "
                CREATE TABLE IF NOT EXISTS formatting_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    name TEXT NOT NULL,
                    target TEXT NOT NULL CHECK(target IN ('row', 'cell')),
                    columnKey TEXT,
                    conditionTree TEXT NOT NULL,
                    backgroundColor TEXT,
                    textColor TEXT,
                    fontWeight TEXT,
                    enabled BIT NOT NULL DEFAULT 1,
                    priority INTEGER NOT NULL DEFAULT 0
                );

                -- Index for enabled rules (used in rendering)
                CREATE INDEX IF NOT EXISTS idx_formatting_rules_enabled ON formatting_rules(enabled, priority);

                -- Insert default formatting rules
                -- Note: Completed items rule has higher priority (lower number) so it takes precedence
                INSERT INTO formatting_rules (name, target, conditionTree, backgroundColor, textColor, enabled, priority)
                SELECT 'Completed items', 'row', '{\"logic\":\"AND\",\"conditions\":[{\"column\":\"doneAt\",\"operator\":\"notEmpty\"}]}', '#dcfce7', '#166534', 1, 1
                WHERE NOT EXISTS (SELECT 1 FROM formatting_rules WHERE name='Completed items');

                INSERT INTO formatting_rules (name, target, conditionTree, backgroundColor, textColor, enabled, priority)
                SELECT 'Overdue items (not done)', 'row', '{\"logic\":\"AND\",\"conditions\":[{\"column\":\"deadlineAt\",\"operator\":\"lt\",\"value\":\"' || strftime('%Y-%m-%d', 'now') || '\"},{\"column\":\"doneAt\",\"operator\":\"empty\"}]}', '#fee2e2', '#991b1b', 1, 2
                WHERE NOT EXISTS (SELECT 1 FROM formatting_rules WHERE name='Overdue items (not done)');
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:data.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Load and set window icon
            let icon_path = app
                .path()
                .resource_dir()
                .expect("failed to get resource dir")
                .join("icons/icon.png");

            if let Ok(icon_bytes) = std::fs::read(&icon_path) {
                if let Ok(img) = image::load_from_memory(&icon_bytes) {
                    let (width, height) = img.dimensions();
                    let rgba = img.into_rgba8().into_raw();

                    let icon = tauri::image::Image::new_owned(rgba, width, height);

                    // Set icon for main window
                    if let Some(main_window) = app.get_webview_window("main") {
                        let _ = main_window.set_icon(icon.clone());
                    }
                    // Set icon for splashscreen
                    if let Some(splashscreen) = app.get_webview_window("splashscreen") {
                        let _ = splashscreen.set_icon(icon);
                    }
                }
            }

            // Close splashscreen and show main window after a delay
            let main_window = app.get_webview_window("main").unwrap();
            let splashscreen = app.get_webview_window("splashscreen").unwrap();

            std::thread::spawn(move || {
                // Wait 2 seconds
                std::thread::sleep(std::time::Duration::from_secs(2));

                // Show main window
                main_window.show().unwrap();
                main_window.set_focus().unwrap();

                // Close splashscreen
                splashscreen.close().unwrap();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
