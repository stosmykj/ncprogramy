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
                -- Create programs table (minimal - columns added dynamically via table_columns)
                CREATE TABLE IF NOT EXISTS programs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
                CREATE INDEX IF NOT EXISTS idx_programs_createdAt ON programs(createdAt);
                CREATE INDEX IF NOT EXISTS idx_programs_updatedAt ON programs(updatedAt);

                -- Create indexes for table_columns
                CREATE INDEX IF NOT EXISTS idx_table_columns_sort ON table_columns(sort, sortPosition);
                CREATE INDEX IF NOT EXISTS idx_table_columns_position ON table_columns(position);

                -- Create index for formatting_rules
                CREATE INDEX IF NOT EXISTS idx_formatting_rules_enabled ON formatting_rules(enabled, priority);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "Add column settings fields",
            sql: "
                -- Add sortable column (default true)
                ALTER TABLE table_columns ADD COLUMN sortable BIT NOT NULL DEFAULT 1;

                -- Add dateFormat for custom date formatting
                ALTER TABLE table_columns ADD COLUMN dateFormat TEXT;

                -- Add copyable column (default true)
                ALTER TABLE table_columns ADD COLUMN copyable BIT NOT NULL DEFAULT 1;

                -- Add inlineEditable column (default true)
                ALTER TABLE table_columns ADD COLUMN inlineEditable BIT NOT NULL DEFAULT 1;

                -- Add incrementalPattern for incremental columns
                ALTER TABLE table_columns ADD COLUMN incrementalPattern TEXT;

                -- Add incrementalRewritable for incremental columns (default false)
                ALTER TABLE table_columns ADD COLUMN incrementalRewritable BIT NOT NULL DEFAULT 0;
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
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
