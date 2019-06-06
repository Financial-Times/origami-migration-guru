origami-migration-guru
=======================

**Origami Migration Guru is not recommended for use. It's currently a proof of concept which is poorly written and _very_ broken.**

Origami Migration Guru helps plan the migration for new major released of components or other projects. For a given project, it analyses a given set of repository manifests looking for dependents. The dependents may be shown as a graph or step by step in an interactive command line interface.

### graph

Generate a graph of dependents.

>Requires `dot`.

```
bin/run tree o-table --manifests="manifests/ebi.txt" --format=dot | dot -Tsvg > ~/Desktop/component.svg
```

### interactive migration guide

Find dependents and the order to migrate them, step by step.

```
bin/run tree o-table --manifests="manifests/ebi.txt" --format=guide
```

### Dependents Overview

Show the count and name of all dependents (direct and indirect).

```
bin/run tree o-table --manifests="manifests/ebi.txt"
```
