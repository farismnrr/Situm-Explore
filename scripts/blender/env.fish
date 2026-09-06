# Source this file from fish to expose the repo-local Blender runtime.
set --local script_dir (path dirname (status filename))
set --local repo_root (path resolve "$script_dir/../..")
set --local blender_bin "$repo_root/.tools/bin"

if not test -x "$blender_bin/blender"
    echo "Repo-local Blender is missing at $blender_bin/blender" >&2
    return 1
end

fish_add_path --path "$blender_bin"
