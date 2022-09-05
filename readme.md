# Salt Node.js Library and CLI

This is both a CLI and library. The cli can be run with `npx salt-js`

## Usage

### CLI

```txt
Usage: npx salt-nodejs [options] [command]

Get specified file from your repos.

Options:
  -V, --version                                          output the version number
  -h, --help                                             display help for command

Commands:
  download|dl [options] <File ID>                        Download a file.
  list|ls                                                List all files in your repos.
  list-repo|list-repository <Repo ID>                    List all files in a repo.
  search|s <Search Query...>                             Search for files in your repos.
  update|u                                               Update the cache of your repos.
  repo-list|repo                                         List all repos.
  repo-add|repoadd <Repo URL>                            Add a repo to your list of repos.
  repo-remove|reporemove <Repo ID>                       Remove a repo from your list of repos.
  extension-list|extension                               List all installed extensions.
  extension-install|extensioninstall <Extension File>    Install an extension.
  extension-uninstall|extensionuninstall <Extension ID>  Uninstall an extension.
  config|conf <Config Property> [Config Value]           View or set properties in the config.
  get-uuid|uuid                                          Get the UUID of the current machine.
  help [command]                                         display help for command
```

## License

MIT License

Copyright (c) 2021-2022 meponder

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.