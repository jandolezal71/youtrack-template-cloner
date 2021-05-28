# Youtrack Template Cloner

Youtrack is ugly and slow and i am lazy to clone every ticket one-by-one.

Script to clone templates for new employee on youtrack.

It will clone parent and all child issues to the same project with same fields.

![](https://i.ibb.co/ysYXy0F/Screencast-2021-05-28-12-08-52.gif)

## Youtrack token

You need to create your youtrack token in `Profile > Hub account > Authentication > New token`.

## Example

```
npm run start -- prepare MNT-123 -t "perm:1234" -u "https://youtrack.domain.com/"
```

OR simply

```
npx jandolezal71/youtrack-template-cloner prepare MNT-123 -t "perm:1234" -u "https://youtrack.domain.com/"
```

## Dev

```
npm run debug -- prepare MNT-123 -t "perm:1234" -u "https://youtrack.domain.com/"
```

### Transpile

```
npm run transpile
```
