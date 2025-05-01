# This is the public repository for the CapybaraGo Tools Website

## Link to live version: https://starryworm.github.io/CapyGo/

## Structure

- index.html
- LICENSE
- README.md
- Projects {folder}
    - Project A {folder}
        - main.html
        - subpage A.html
        - subpage B.html
        - ...
        - project.md (acts as the readme.md file for the project)
        - assets {folder}
            - asset A
            - asset B
            - ...
    - Project B {folder}
    - ...

## Usage
* Feel free to make pull requests to add your own project folders. 
* Each project folder will be assigned an owner (based on pull request) who will be asked to review the changes before I (Starryworm/NoLuck, repo * maintainer) review them and commit them.
* The repo maintainer is in charge of updating index.html - which represents publishing a project to the homepage of the live version. 
* There is no dedicated dev environment, all testing is done locally - recommended: VSCode with LiveServer extension
* There is no dedicated QA environment, but any html file can be accessed even if it is not linked to in the index.html page by typing its path in the browser
    * i.e. https://starryworm.github.io/CapyGo/Projects/{project}/{page.html}
