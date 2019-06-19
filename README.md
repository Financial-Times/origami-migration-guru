origami-migration-guru
=======================

**Origami Migration Guru is experimental.**

Origami Migration Guru helps plan the migration for new major released of components or other projects. For a given project, it analyses a given set of repository manifests looking for dependents. The dependents may be shown as a graph or step by step in an interactive command line interface.

### interactive migration guide

Find dependents and the order to migrate them, step by step.

For an interactive guide:
```bash
bin/run guide o-table manifests/ebi.txt
```

Or:
```bash
cat manifests/ebi.txt | bin/run guide o-table
```

### graph

Create a migration guide in [DOT format](https://en.wikipedia.org/wiki/DOT_(graph_description_language)).

```bash
cat manifests/ebi.txt | bin/run dot o-table
```

This can be turned into a graph using tools such as `dot`.
```bash
cat manifests/ebi.txt | bin/run dot o-table | dot -Tsvg > ~/Desktop/component.svg
```

### Overview

List direct and indirect dependents.

Interactive:
```bash
bin/run stats o-table manifests/ebi.txt
```

Or:
```bash
cat manifests/ebi.txt | bin/run stats o-table
```
