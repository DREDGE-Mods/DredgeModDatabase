interface ModInfo {
    name : string,
    mod_guid : string,
    repo : string,
    download : string
}

interface DatabaseModInfo extends ModInfo {
    description?: string,
    downloads?: number,
    release_date?: string,
    latest_version?: string
}