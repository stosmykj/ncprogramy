use image::GenericImageView;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "Initial database setup",
            sql: "
                -- Create programs table
                CREATE TABLE IF NOT EXISTS programs (
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

                -- Create settings table
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    key TEXT NOT NULL UNIQUE,
                    type TEXT NOT NULL,
                    value TEXT
                );

                -- Create table_columns metadata table
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
                    archived BIT NOT NULL DEFAULT 0,
                    label TEXT,
                    computeExpression TEXT
                );

                -- Create formatting_rules table
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

                -- Create indexes for programs table
                CREATE INDEX IF NOT EXISTS idx_programs_programId ON programs(programId);
                CREATE INDEX IF NOT EXISTS idx_programs_deadlineAt ON programs(deadlineAt);
                CREATE INDEX IF NOT EXISTS idx_programs_arrivedAt ON programs(arrivedAt);
                CREATE INDEX IF NOT EXISTS idx_programs_doneAt ON programs(doneAt);
                CREATE INDEX IF NOT EXISTS idx_programs_createdAt ON programs(createdAt);
                CREATE INDEX IF NOT EXISTS idx_programs_updatedAt ON programs(updatedAt);
                CREATE INDEX IF NOT EXISTS idx_programs_programId_deadlineAt ON programs(programId, deadlineAt);

                -- Create indexes for table_columns
                CREATE INDEX IF NOT EXISTS idx_table_columns_sort ON table_columns(sort, sortPosition);
                CREATE INDEX IF NOT EXISTS idx_table_columns_position ON table_columns(position);

                -- Create index for formatting_rules
                CREATE INDEX IF NOT EXISTS idx_formatting_rules_enabled ON formatting_rules(enabled, priority);

                -- Insert default column configurations
                INSERT INTO table_columns (key, type, position, visible, width, align, label)
                SELECT 'actions', '', 0, 1, '200', 'center', 'Akce'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='actions');

                INSERT INTO table_columns (key, type, position, visible, label)
                SELECT 'id', 'number', 1, 0, 'ID'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='id');

                INSERT INTO table_columns (key, type, position, visible, label)
                SELECT 'createdAt', 'datetime', 2, 0, 'Vytvořeno'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='createdAt');

                INSERT INTO table_columns (key, type, position, visible, label)
                SELECT 'updatedAt', 'datetime', 3, 0, 'Upraveno'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='updatedAt');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'programId', 'string', 4, 'Číslo programu'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='programId');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'name', 'string', 5, 'Název'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='name');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'orderNumber', 'string', 6, 'Číslo zakázky'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='orderNumber');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'deadlineAt', 'date', 7, 'Termín'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='deadlineAt');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'arrivedAt', 'date', 8, 'Přijato'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='arrivedAt');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'doneAt', 'date', 9, 'Dokončeno'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='doneAt');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'count', 'number', 10, 'Počet kusů'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='count');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'design', 'file', 11, 'Design'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='design');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'drawing', 'file', 12, 'Výkres'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='drawing');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'clamping', 'file', 13, 'Upínání'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='clamping');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'preparing', 'number', 14, 'Příprava'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='preparing');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'programing', 'number', 15, 'Programování'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='programing');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'machineWorking', 'number', 16, 'Strojní čas'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='machineWorking');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'extraTime', 'string', 17, 'Extra čas'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='extraTime');

                INSERT INTO table_columns (key, type, position, label)
                SELECT 'note', 'string', 18, 'Poznámka'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='note');

                -- Insert totalTime as a computed column
                INSERT INTO table_columns (key, type, position, computeExpression, label)
                SELECT 'totalTime', 'computed', 19, '(COALESCE(count, 0) * COALESCE(machineWorking, 0)) + COALESCE(programing, 0) + COALESCE(preparing, 0)', 'Celkový čas'
                WHERE NOT EXISTS (SELECT 1 FROM table_columns WHERE key='totalTime');

                -- Insert default formatting rules
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
