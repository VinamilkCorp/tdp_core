from phovea_server.ns import abort


def map_scores(scores, from_idtype, to_idtype):
  """
  maps the given scores from idtype to to idtype
  :param scores:
  :param from_idtype:
  :param to_idtype:
  :return: a mapped version of the scores
  """
  from phovea_server.dataset import get_mappingmanager
  from itertools import izip

  if len(scores) == 0:
    return []

  manager = get_mappingmanager()
  if not manager.can_map(from_idtype, to_idtype):
    abort(400, 'score cannot be mapped to target')
  mapped_ids = manager(from_idtype, to_idtype, [r['id'] for r in scores])

  mapped_scores = []
  for score, mapped in izip(scores, mapped_ids):
    if not mapped:
      continue
    for target_id in mapped:
      clone = score.copy()
      clone['id'] = target_id
      mapped_scores.append(clone)
  return mapped_scores