interface ModInfo {
    name : string,
    mod_guid : string,
    repo : string,
    download : string,
    description? : string,
    author? : string,
    downloads_offset?: number,
    readme_path? : string
}

interface DatabaseModInfo extends ModInfo {
    downloads?: number,
    repo_creation_date?: string;
    repo_update_date?: string;
    release_date?: string,
    asset_update_date?: string,
    latest_version?: string,
    readme_url?: string,
    readme_raw?: string,
    thumbnail?: string,
    latest_release_description?: string
}