interface ModInfo {
    name : string,
    mod_guid : string,
    repo : string,
    download : string,
    description? : string,
    author? : string
}

interface DatabaseModInfo extends ModInfo {
    downloads?: number,
    release_date?: string,
    latest_version?: string,
    readme_url?: string,
    readme_raw?: string
}